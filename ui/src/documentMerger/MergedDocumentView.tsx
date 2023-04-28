import {MergeLine} from './mergeDocument';
import {MergeDocumentLine} from './DocumentMerger';
import {useTranslation} from 'react-i18next';

import {writeNode, XmlNode, findFirstXmlElementByTagName, isXmlTextNode, xmlElementNode, xmlTextNode, XmlElementNode} from 'simple_xml';
import {handleSaveToPC} from '../xmlEditor/XmlDocumentEditorContainer';
import {writeXml} from '../xmlEditor/XmlDocumentEditor';
import xmlFormat from 'xml-formatter';

interface IProps {
  lines: MergeLine[];
  header: XmlElementNode;
  publicationMapping: Map<string, string[]>;
}

export function MergedDocumentView({lines, header, publicationMapping}: IProps): JSX.Element {

  const {t} = useTranslation('common');

  function onExport(): void {
    const lineNodes = lines
      .map<XmlNode[]>(({lineNumberNode, rest}) => [lineNumberNode, ...rest])
      .flat();
    const childNodes = writePublMapping().concat(lineNodes);
    const newBody: XmlElementNode = {
      tagName: 'body',
      attributes: {},
      children: [xmlElementNode('div1', {'type':'transliteration'}, [xmlElementNode('text', {'xml:lang':'XXXlang'}, childNodes)])]
    };

    const AOxml: XmlElementNode = {
      tagName: 'AOxml',
      attributes: {'xmlns:hpm':'http://hethiter.net/ns/hpm/1.0',
                   'xmlns:AO': 'http://hethiter.net/ns/AO/1.0',
                   'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
                   'xmlns:meta': 'urn:oasis:names:tc:opendocument:xmlns:meta:1.0',
                   'xmlns:text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
                   'xmlns:table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
                   'xmlns:draw': 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0',
                   'xmlns:xlink': 'http://www.w3.org/1999/xlink'
      },
      children: [header, newBody]
    };

    const exported = writeXml(AOxml);

    let filename = 'merged';
    const docIDnode = findFirstXmlElementByTagName(header, 'docID');
    if (docIDnode && isXmlTextNode(docIDnode.children[0])) {
      filename = docIDnode.children[0].textContent;
    }
    handleSaveToPC(exported, filename + '.xml');
  }

  function writePublMapping(): XmlNode[] {
    const publications: XmlNode[] = [];
    console.log(publicationMapping);
    let i = 0;
    for (const publ of Array.from(publicationMapping.values())) {
      if (i > 0) { publications.push(xmlTextNode('+')); }
      console.log(publ[1] + '{€' + publ[0] + '}');
      publications.push(xmlElementNode('AO:TxtPubl',
        {},
        [xmlTextNode(
          (publ[1] + '{€' + publ[0] + '}')
            .replace('\n','')
            .replace('\t', '')
        )]));
      i++;
    }

    return [xmlElementNode('AO:Manuscripts', {}, publications)];
  }

  return (
    <>
      <button type="button" className="mb-2 p-2 rounded bg-blue-500 text-white w-full" onClick={onExport}>{t('export')}</button>
      <pre><code>{xmlFormat(writeNode(header).join('\n'), {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n'
      })}</code></pre>
      {lines.map((l, index) => <p key={index}><MergeDocumentLine line={l}/></p>)}
    </>
  );
}