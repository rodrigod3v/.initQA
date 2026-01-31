import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import type { EditorProps as MonacoEditorProps } from '@monaco-editor/react';

const MonacoEditor = lazy(() => import('@monaco-editor/react')) as React.LazyExoticComponent<React.FC<MonacoEditorProps>>;

interface EditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language?: string;
    height?: string;
    readOnly?: boolean;
}

const Editor: React.FC<EditorProps> = ({
    value,
    onChange,
    language = 'json',
    height = '300px',
    readOnly = false
}) => {
    return (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e]">
            <Suspense fallback={
                <div className="flex items-center justify-center p-10" style={{ height }}>
                    <Loader2 className="animate-spin text-slate-400" size={24} />
                </div>
            }>
                <MonacoEditor
                    height={height}
                    language={language}
                    value={value}
                    onChange={onChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                />
            </Suspense>
        </div>
    );
};

export default Editor;
