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
        <div className="border border-main border-sharp overflow-hidden bg-deep" style={{ height }}>
            <Suspense fallback={
                <div className="flex items-center justify-center p-10" style={{ height }}>
                    <Loader2 className="animate-spin text-accent" size={24} />
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
                        fontSize: 13,
                        fontFamily: 'var(--font-mono)',
                        readOnly,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6
                        },
                        padding: { top: 8, bottom: 8 }
                    }}
                />
            </Suspense>
        </div>
    );
};

export default Editor;
