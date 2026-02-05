import React from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language?: string;
    height?: string;
    readOnly?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
    value,
    onChange,
    language = 'json',
    height = '100%',
    readOnly = false
}) => {
    return (
        <Editor
            height={height}
            language={language}
            theme="vs-dark"
            value={value}
            onChange={onChange}
            options={{
                minimap: { enabled: false },
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly,
                backgroundColor: '#0A0A0B',
            }}
        />
    );
};
