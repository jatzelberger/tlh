import {XmlEditableNodeIProps, XmlSingleEditableNodeConfig} from './editorConfig';
import classNames from 'classnames';
import {useTranslation} from 'react-i18next';
import {XmlElementNode} from '../xmlModel/xmlModel';
import {NodeEditorRightSide} from '../NodeEditorRightSide';

function isLineGapNode(node: XmlElementNode): boolean {
  return 't' in node.attributes && node.attributes.t === 'line';
}

export const gapConfig: XmlSingleEditableNodeConfig = {
  replace: (node, _renderedChildren, isSelected) => (
    <>
      {isLineGapNode(node) && <br/>}
      <span className={classNames('gap', {'marked': isSelected})}>{node.attributes.c}</span>
    </>
  ),
  edit: (props) => <GapEditor {...props}/>,
  readNode: (n) => n,
  writeNode: (n) => n
};

function GapEditor({data, originalNode, updateNode, changed, initiateSubmit, deleteNode, initiateJumpElement}: XmlEditableNodeIProps): JSX.Element {

  const {t} = useTranslation('common');

  return (
    <NodeEditorRightSide originalNode={originalNode} changed={changed} initiateSubmit={initiateSubmit} deleteNode={deleteNode}
                         jumpElement={initiateJumpElement}>
      <div>
        <label htmlFor="content" className="font-bold">{t('content')}:</label>

        <input type="text" defaultValue={data.attributes.c} id="content" className="mt-2 p-2 rounded border border-slate-500 w-full"
               onBlur={(event) => updateNode({attributes: {c: {$set: event.target.value}}})}/>
      </div>
    </NodeEditorRightSide>
  );
}