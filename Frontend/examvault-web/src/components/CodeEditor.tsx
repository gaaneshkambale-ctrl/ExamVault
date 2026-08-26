import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { ProgrammingLanguage } from '../types/question';

function workerUrl(path: string): URL {
  return new URL(`monaco-editor/esm/vs/${path}`, import.meta.url);
}

// Self-hosted, not the CDN @monaco-editor/react uses by default - a student
// mid-exam can't be left with a dead editor because a third-party CDN is
// unreachable. Standard Vite + Monaco worker wiring, using import.meta.url
// worker construction (the `?worker` suffix import doesn't resolve here).
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    let path = 'editor/editor.worker.js';
    switch (label) {
      case 'json':
        path = 'language/json/json.worker.js';
        break;
      case 'css':
      case 'scss':
      case 'less':
        path = 'language/css/css.worker.js';
        break;
      case 'html':
      case 'handlebars':
      case 'razor':
        path = 'language/html/html.worker.js';
        break;
      case 'typescript':
      case 'javascript':
        path = 'language/typescript/ts.worker.js';
        break;
    }
    return new Worker(workerUrl(path), { type: 'module' });
  },
};
loader.config({ monaco });

const MONACO_LANGUAGE_ID: Record<ProgrammingLanguage, string> = {
  CSharp: 'csharp',
  Java: 'java',
  Python: 'python',
  Cpp: 'cpp',
  JavaScript: 'javascript',
  Sql: 'sql',
};

interface CodeEditorProps {
  language: ProgrammingLanguage | null | undefined;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number | string;
}

export default function CodeEditor({
  language,
  value,
  onChange,
  readOnly = false,
  height = 360,
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      language={language ? MONACO_LANGUAGE_ID[language] : 'plaintext'}
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange?.(next ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
