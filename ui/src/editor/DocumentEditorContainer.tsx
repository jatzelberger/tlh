import {useState} from 'react';
import {FileLoader} from '../forms/FileLoader';
import {XmlNode} from './xmlModel/xmlModel';
import {DocumentEditor} from './DocumentEditor';
import {loadNewXml} from './xmlModel/xmlReading';
import classNames from 'classnames';
import {isDebug} from '../index';

const localStorageEditorStateKey = 'editorState';

function handleSaveToPC(data: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(
    new Blob([data], {type: 'text/plain'})
  );
  link.click();
}

interface LoadedDocument {
  filename: string;
  rootNode: XmlNode;
}

function initialState(): LoadedDocument | undefined {
  const maybeEditorState = localStorage.getItem(localStorageEditorStateKey);

  return maybeEditorState
    ? JSON.parse(maybeEditorState)
    : undefined;
}

function autoSave(filename: string, rootNode: XmlNode): void {
  localStorage.setItem(localStorageEditorStateKey, JSON.stringify({filename, rootNode}));
}

function removeAutoSave(): void {
  localStorage.removeItem(localStorageEditorStateKey);
}


export function DocumentEditorContainer(): JSX.Element {

  const [state, setState] = useState<LoadedDocument | undefined>(initialState());

  async function readFile(file: File): Promise<void> {
    setState({rootNode: await loadNewXml(file), filename: file.name});
  }

  function download(content: string): void {
    state && handleSaveToPC(content, state.filename);
  }

  function closeFile(): void {
    setState(undefined);
    removeAutoSave();
  }

  return (
    <div className={classNames('h-full', 'max-h-full', isDebug ? ['border-2', 'border-amber-500'] : [])}>
      {state
        ? <DocumentEditor node={state.rootNode} download={download} filename={state.filename} closeFile={closeFile}
                          autoSave={(node) => autoSave(state.filename, node)}/>
        : <div className="container mx-auto">
          <FileLoader accept="text/xml" onLoad={readFile}/>
          {/* TODO: let users open recently closed files? */}
        </div>}
    </div>
  );
}