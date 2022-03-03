import {XmlEditorConfig} from './editorConfig/editorConfig';
import {useTranslation} from 'react-i18next';
import {InsertablePositions} from './insertablePositions';
import {ActivatableButton} from '../bulmaHelpers/Buttons';

interface IProps {
  editorConfig: XmlEditorConfig;
  currentInsertedElement?: string;
  toggleElementInsert: (tagName: string, ip: InsertablePositions) => void;
}

export function EditorEmptyRightSide({editorConfig, currentInsertedElement, toggleElementInsert}: IProps): JSX.Element {

  const {t} = useTranslation('common');

  const insertableTags: [string, InsertablePositions][] = Object.entries(editorConfig.nodeConfigs)
    .map<[string, InsertablePositions | undefined]>(([tagName, {insertablePositions}]) => [tagName, insertablePositions])
    .filter((t): t is [string, InsertablePositions] => !!t[1]);

  return (
    <div>
      <h2 className="p2 text-center font-bold text-lg">{t('insertableElements')}</h2>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {insertableTags.map(([tagName, insertablePositions]) =>
          <ActivatableButton key={tagName} text={tagName} isActive={tagName === currentInsertedElement}
                             onClick={() => toggleElementInsert(tagName, insertablePositions)} otherClasses={['p-2', 'rounded']}/>
        )}
      </div>
    </div>
  );
}
