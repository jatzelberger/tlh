<?php

namespace model;

require_once __DIR__ . '/../MySafeGraphQLException.php';
require_once __DIR__ . '/Rights.php';
require_once __DIR__ . '/User.php';
require_once __DIR__ . '/Manuscript.php';
require_once __DIR__ . '/DocumentInPipeline.php';

use Exception;
use GraphQL\Type\Definition\{ObjectType, Type};
use MySafeGraphQLException;
use mysqli;
use mysqli_stmt;
use sql_helpers\SqlHelpers;

class ExecutiveEditor
{
  static ObjectType $queryType;
  static ObjectType $mutationsType;

  static function updateRights(string $username, string $newRights): bool
  {
    return SqlHelpers::executeSingleChangeQuery(
      "update tlh_dig_users set rights = ? where username = ?;",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('ss', $newRights, $username)
    );
  }

  static function upsertReviewerAppointmentForReleasedTransliteration(string $mainIdentifier, string $reviewer, string $appointedBy): string
  {
    return SqlHelpers::executeSingleChangeQuery(
      "
insert into tlh_dig_transliteration_review_appointments (main_identifier, username, appointed_by_username)
values (?, ?, ?)
on duplicate key update username = ?, appointed_by_username = ?, appointment_date = now();",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('sssss', $mainIdentifier, $reviewer, $appointedBy, $reviewer, $appointedBy)
    );
  }

  static function upsertXmlConversionAppointment(string $mainIdentifier, string $converter, string $appointedBy): string
  {
    return SqlHelpers::executeSingleChangeQuery(
      "
insert into tlh_dig_xml_conversion_appointments (main_identifier, username, appointed_by_username)
values (?, ?, ?)
on duplicate key update username = ?, appointed_by_username = ?, appointment_date = now();",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('sssss', $mainIdentifier, $converter, $appointedBy, $converter, $appointedBy)
    );
  }

  static function upsertFirstXmlReviewAppointment(string $mainIdentifier, string $reviewer, string $appointedBy): string
  {
    return SqlHelpers::executeSingleChangeQuery(
      "
insert into tlh_dig_first_xml_review_appointments (main_identifier, username, appointed_by_username)
values (?, ?, ?)
on duplicate key update username = ?, appointed_by_username = ?, appointment_date = now();",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('sssss', $mainIdentifier, $reviewer, $appointedBy, $reviewer, $appointedBy)
    );
  }

  static function upsertSecondXmlReviewAppointment(string $mainIdentifier, string $reviewer, string $appointedBy): string
  {
    return SqlHelpers::executeSingleChangeQuery(
      "
insert into tlh_dig_second_xml_review_appointments (main_identifier, username, appointed_by_username)
values (?, ?, ?)
on duplicate key update username = ?, appointed_by_username = ?, appointment_date = now();",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('sssss', $mainIdentifier, $reviewer, $appointedBy, $reviewer, $appointedBy)
    );
  }

  /** @return string[] */
  static function selectDocumentsAwaitingApproval(): array
  {
    return SqlHelpers::executeMultiSelectQuery(
      "
select second_xml_revs.main_identifier
from tlh_dig_second_xml_reviews as second_xml_revs
    left outer join tlh_dig_approved_transliterations as approved_trans using(main_identifier)
where approved_trans.input is null;",
      null,
      fn(array $row): string => $row['main_identifier']
    );
  }

  static function selectDocumentAwaitingApproval(string $mainIdentifier): ?string
  {
    return SqlHelpers::executeSingleReturnRowQuery(
      "
select second_xml_revs.input
from tlh_dig_second_xml_reviews as second_xml_revs
    left outer join tlh_dig_approved_transliterations as approved_trans using(main_identifier)
where approved_trans.input is null and second_xml_revs.main_identifier = ?;",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('s', $mainIdentifier),
      fn(array $row): ?string => $row['input']
    );
  }

  static function selectDocumentApproved(string $mainIdentifier): bool
  {
    return SqlHelpers::executeSingleReturnRowQuery(
      "select count(*) as count from tlh_dig_approved_transliterations where main_identifier = ?;",
      fn(mysqli_stmt $stmt): bool => $stmt->bind_param('s', $mainIdentifier),
      fn(array $row): bool => $row['count'] === 1
    );
  }

  /** @throws Exception */
  static function insertApproval(string $mainIdentifier, string $xml, string $approvalUsername): bool
  {
    return SqlHelpers::executeQueriesInTransactions(function (mysqli $conn) use ($mainIdentifier, $xml, $approvalUsername): bool {
      $approvalDate = SqlHelpers::executeSingleReturnRowQuery(
        "insert into tlh_dig_approved_transliterations (main_identifier, input, approval_username) values (?, ?, ?) returning approval_date;",
        fn(mysqli_stmt $stmt): bool => $stmt->bind_param('sss', $mainIdentifier, $xml, $approvalUsername),
        fn(array $row): string => $row['approval_date'],
        $conn
      );

      if (is_null($approvalDate)) {
        throw new Exception("Could not insert approval!");
      }

      return SqlHelpers::executeSingleChangeQuery(
        "update tlh_dig_manuscripts set status = 'Approved' where main_identifier = ?;",
        fn(mysqli_stmt $stmt): bool => $stmt->bind_param('s', $mainIdentifier),
        $conn
      );
    });
  }
}

ExecutiveEditor::$queryType = new ObjectType([
  'name' => 'ExecutiveEditor',
  'fields' => [
    'userCount' => [
      'type' => Type::nonNull(Type::int()),
      'resolve' => fn(): int => User::selectCount()
    ],
    'users' => [
      'type' => Type::nonNull(Type::listOf(Type::nonNull(User::$graphQLQueryType))),
      'args' => [
        'page' => Type::nonNull(Type::int())
      ],
      'resolve' => fn(User $_user, array $args): array => User::selectUsersPaginated($args['page'])
    ],
    'allReviewers' => [
      'type' => Type::nonNull(Type::listOf(Type::nonNull(Type::string()))),
      'resolve' => fn(): array => User::selectAllReviewers()
    ],
    'documentsInPipelineCount' => [
      'type' => Type::nonNull(Type::int()),
      'resolve' => fn() => DocumentInPipeline::selectCount()
    ],
    'documentsInPipeline' => [
      'type' => Type::nonNull(Type::listOf(Type::nonNull(DocumentInPipeline::$queryType))),
      'args' => [
        'page' => Type::int()
      ],
      'resolve' => fn(User $_user, array $args): array => DocumentInPipeline::selectDocumentsInPipeline($args['page'] ?? 0)
    ],
    'documentsAwaitingApproval' => [
      'type' => Type::nonNull(Type::listOf(Type::nonNull(Type::string()))),
      'resolve' => fn(User $_user, array $args): array => ExecutiveEditor::selectDocumentsAwaitingApproval()
    ],
    'documentAwaitingApproval' => [
      'type' => TYpe::string(),
      'args' => [
        'mainIdentifier' => Type::nonNull(Type::string())
      ],
      'resolve' => fn(User $_user, array $args): ?string => ExecutiveEditor::selectDocumentAwaitingApproval($args['mainIdentifier'])
    ]
  ]
]);

/** @throws MySafeGraphQLException */
function resolveReviewer(string $username): User
{
  $user = User::selectUserFromDatabase($username);

  if (is_null($user)) {
    throw new MySafeGraphQLException("User $username doesn't exist!");
  }

  if (!$user->isReviewer()) {
    throw new MySafeGraphQLException("User $user->username is no reviewer!");
  }

  return $user;
}

ExecutiveEditor::$mutationsType = new ObjectType([
  'name' => 'ExecutiveEditorMutations',
  'fields' => [
    'updateUserRights' => [
      'type' => Type::nonNull(Rights::$graphQLType),
      'args' => [
        'username' => Type::nonNull(Type::string()),
        'newRights' => Type::nonNull(Rights::$graphQLType),
      ],
      'resolve' => function (User $user, array $args): string {
        $username = $args['username'];
        $newRights = $args['newRights'];

        if (ExecutiveEditor::updateRights($username, $newRights)) {
          return $newRights;
        } else {
          throw new MySafeGraphQLException("Could not change rights for user $username to $newRights");
        }
      }
    ],
    'appointTransliterationReviewer' => [
      'type' => Type::nonNull(Type::string()),
      'args' => [
        'manuscriptIdentifier' => Type::nonNull(Type::string()),
        'reviewer' => Type::nonNull(Type::string()),
      ],
      'resolve' => function (User $user, array $args): string {
        $reviewer = resolveReviewer($args['reviewer']);
        $manuscript = Manuscript::resolveManuscriptById($args['manuscriptIdentifier']);

        $inserted = ExecutiveEditor::upsertReviewerAppointmentForReleasedTransliteration($manuscript->mainIdentifier->identifier, $reviewer->username, $user->username);

        if (!$inserted) {
          return false;
        }

        mail(
          $reviewer->email,
          "[TLHdig] Assigned to review the transliteration of manuscript " . $manuscript->mainIdentifier->identifier,
          "You have been assigned to review the transliteration of manuscript " . $manuscript->mainIdentifier->identifier
        );

        return true;
      }
    ],
    'appointXmlConverter' => [
      'type' => Type::nonNull(Type::string()),
      'args' => [
        'manuscriptIdentifier' => Type::nonNull(Type::string()),
        'converter' => Type::nonNull(Type::string())
      ],
      'resolve' => function (User $user, array $args): string {
        $converter = resolveReviewer($args['converter']);
        $manuscript = Manuscript::resolveManuscriptById($args['manuscriptIdentifier']);

        if (!$manuscript->selectTransliterationIsReleased()) {
          throw new MySafeGraphQLException("Transliteration of manuscript " . $manuscript->mainIdentifier->identifier . " is not yet released!");
        }
        if ($manuscript->selectXmlConversionPerformed()) {
          throw new MySafeGraphQLException("Xml conversion of manuscript " . $manuscript->mainIdentifier->identifier . " was already performed!");
        }

        return ExecutiveEditor::upsertXmlConversionAppointment($manuscript->mainIdentifier->identifier, $converter->username, $user->username);
      }
    ],
    'appointFirstXmlReviewer' => [
      'type' => Type::nonNull(Type::string()),
      'args' => [
        'manuscriptIdentifier' => Type::nonNull(Type::string()),
        'reviewer' => Type::nonNull(Type::string())
      ],
      'resolve' => function (User $user, array $args): string {
        $manuscriptIdentifier = $args['manuscriptIdentifier'];
        $reviewer = resolveReviewer($args['reviewer']);

        $manuscript = Manuscript::selectManuscriptById($manuscriptIdentifier);

        if (!$manuscript->selectTransliterationIsReleased()) {
          throw new MySafeGraphQLException("Transliteration of manuscript $manuscriptIdentifier is not yet released!");
        }
        if (FirstXmlReviewer::selectFirstXmlReviewPerformed($manuscriptIdentifier)) {
          throw new MySafeGraphQLException("First xml review of manuscript $manuscriptIdentifier was already performed!");
        }

        return ExecutiveEditor::upsertFirstXmlReviewAppointment($manuscript->mainIdentifier->identifier, $reviewer->username, $user->username);
      }
    ],
    'appointSecondXmlReviewer' => [
      'type' => Type::nonNull(Type::string()),
      'args' => [
        'manuscriptIdentifier' => Type::nonNull(Type::string()),
        'reviewer' => Type::nonNull(Type::string())
      ],
      'resolve' => function (User $user, array $args): string {
        $manuscriptIdentifier = $args['manuscriptIdentifier'];
        $reviewer = resolveReviewer($args['reviewer']);

        $manuscript = Manuscript::selectManuscriptById($manuscriptIdentifier);

        if (!$manuscript->selectTransliterationIsReleased()) {
          throw new MySafeGraphQLException("Transliteration of manuscript $manuscriptIdentifier is not yet released!");
        }
        if ($manuscript->selectSecondXmlReviewPerformed()) {
          throw new MySafeGraphQLException("Second xml review of manuscript $manuscriptIdentifier was already performed!");
        }

        return ExecutiveEditor::upsertSecondXmlReviewAppointment($manuscript->mainIdentifier->identifier, $reviewer->username, $user->username);
      }
    ],
    'submitApproval' => [
      'type' => Type::nonNull(Type::boolean()),
      'args' => [
        'manuscriptIdentifier' => Type::nonNull(Type::string()),
        'input' => Type::nonNull(Type::string())
      ],
      'resolve' => function (User $user, array $args): bool {
        $manuscriptIdentifier = $args['manuscriptIdentifier'];
        $input = $args['input'];

        $manuscript = Manuscript::resolveManuscriptById($manuscriptIdentifier);

        // TODO: check conditions -> not submitted yet...!

        if (!$manuscript->selectSecondXmlReviewPerformed()) {
          throw new MySafeGraphQLException("Second xml review of manuscript $manuscriptIdentifier was not yet performed!");
        }

        if (ExecutiveEditor::selectDocumentApproved($manuscriptIdentifier)) {
          throw new MySafeGraphQLException("Manuscript $manuscriptIdentifier has already been approved!");
        }

        $inserted = ExecutiveEditor::insertApproval($manuscriptIdentifier, $input, $user->username);

        sendMailToAdmins(
          "The Manuscript $manuscriptIdentifier was released",
          "The Manuscript $manuscriptIdentifier was released",
        );

        return $inserted;
      }
    ]
  ]
]);