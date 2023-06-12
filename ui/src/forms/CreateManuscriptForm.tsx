import {useTranslation} from 'react-i18next';
import {JSX} from 'react';
import {
  ManuscriptIdentifierInput,
  ManuscriptIdentifierType,
  ManuscriptLanguageAbbreviations,
  ManuscriptMetaDataInput,
  PalaeographicClassification,
  useCreateManuscriptMutation
} from '../graphql';
import {Field, FieldArray, FieldArrayRenderProps, Form, Formik, FormikErrors} from 'formik';
import {manuscriptSchema} from './manuscriptSchema';
import classNames from 'classnames';
import {ManuscriptIdInputField} from './ManuscriptIdInputField';
import {Navigate} from 'react-router-dom';
import {PalaeographicClassificationField} from './PalaeographicField';
import {manuscriptsUrlFragment} from '../urls';
import {ProvenanceField} from './ProvenanceField';
import {getNameForManuscriptLanguageAbbreviation, manuscriptLanguageAbbreviations} from './manuscriptLanguageAbbreviations';

function newManuscriptIdentifier(): ManuscriptIdentifierInput {
  return {
    identifier: '',
    identifierType: ManuscriptIdentifierType.CollectionNumber
  };
}

const initialValues: ManuscriptMetaDataInput = {
  mainIdentifier: newManuscriptIdentifier(),
  otherIdentifiers: [],
  palaeographicClassification: PalaeographicClassification.Unclassified,
  palaeographicClassificationSure: false,
  defaultLanguage: ManuscriptLanguageAbbreviations.Hit,
  bibliography: undefined,
  provenance: undefined,
  cthClassification: undefined
};

export function CreateManuscriptForm(): JSX.Element {

  const {t} = useTranslation('common');
  const [createManuscript, {data, loading, error}] = useCreateManuscriptMutation();

  const newIdentifier = data?.me?.identifier;

  if (newIdentifier) {
    return <Navigate to={`/${manuscriptsUrlFragment}/${encodeURIComponent(newIdentifier)}/data`}/>;
  }

  const handleSubmit = (manuscriptMetaData: ManuscriptMetaDataInput): Promise<void> =>
    createManuscript({variables: {manuscriptMetaData}})
      .then(() => void 0)
      .catch((e) => console.error(e));

  return (
    <div className="container mx-auto">

      <h1 className="mb-4 font-bold text-2xl text-center">{t('createManuscript')}</h1>

      <Formik initialValues={initialValues} validationSchema={manuscriptSchema} onSubmit={handleSubmit}>
        {({errors, touched, setFieldValue, values}) => <Form>

          <div className="mt-2">
            <label className="font-bold">{t('mainIdentifier')}*:</label>
            <ManuscriptIdInputField mainId="mainIdentifier" errors={errors.mainIdentifier} touched={touched.mainIdentifier}/>
          </div>

          <FieldArray name="otherIdentifiers">
            {(arrayHelpers: FieldArrayRenderProps) => <>
              <div className="mt-2">
                <label className="font-bold">{t('otherIdentifier_plural')}:</label>

                {values.otherIdentifiers && values.otherIdentifiers.map((otherIdentifier: ManuscriptIdentifierInput, index: number) =>
                  <ManuscriptIdInputField
                    key={index} mainId={`otherIdentifiers.${index}`}
                    deleteFunc={() => arrayHelpers.remove(index)}
                    errors={errors.otherIdentifiers ? errors.otherIdentifiers[index] as FormikErrors<ManuscriptIdentifierInput> : undefined}
                    touched={touched.otherIdentifiers ? touched.otherIdentifiers[index] : undefined}/>
                )}
              </div>

              <button type="button" className="mt-2 px-4 py-2 rounded bg-blue-600 text-white" onClick={() => arrayHelpers.push(newManuscriptIdentifier())}>
                +
              </button>
            </>}
          </FieldArray>

          <PalaeographicClassificationField
            palaeographicClassificationSure={values.palaeographicClassificationSure}
            setPalaeographicClassificationSure={(value) => setFieldValue('palaeographicClassificationSure', value)}/>

          <ProvenanceField/>

          <div className="my-2">
            <label htmlFor="defaultLanguage" className="font-bold">{t('defaultLanguage')}</label>

            <Field as="select" name="defaultLanguage" id="defaultLangauge" placeholder={t('defaultLanguage')}
                   className="my-2 p-2 rounded border border-slate-500 bg-white w-full">
              {manuscriptLanguageAbbreviations.map((abbreviation) =>
                <option key={abbreviation} value={abbreviation}>{getNameForManuscriptLanguageAbbreviation(abbreviation, t)}</option>)}
            </Field>
          </div>

          <div className="mt-2">
            <label htmlFor="cthClassification" className="font-bold">{t('(proposed)CthClassification')}:</label>

            <Field type="number" name="cthClassification" id="cthClassification" placeholder={t('(proposed)CthClassification')}
                   className="mt-2 p-2 rounded border border-slate-500 w-full"/>
          </div>

          <div className="mt-2">
            <label htmlFor="bibliography" className="font-bold">{t('bibliography')}</label>

            <Field as="textarea" name="bibliography" id="bibliography" placeholder={t('bibliography')}
                   className="mt-2 p-2 rounded border border-slate-500 w-full"/>
          </div>


          {error && <div className="my-2 p-2 rounded bg-red-600 text-white text-center">{error.message}</div>}

          <button type="submit" disabled={loading || !!newIdentifier}
                  className={classNames('mt-2', 'p-2', 'rounded', 'bg-blue-600', 'text-white', 'w-full', {'is-loading': loading})}>
            {t('createManuscript')}
          </button>

        </Form>}
      </Formik>
    </div>
  );
}
