import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Editor from '../components/Editor';
import {
    Plus,
    Settings,
    Send,
    CheckCircle2,
    XCircle,
    Loader2,
    FileJson,
    Activity,
    Code
} from 'lucide-react';

interface RequestModel {
    id: string;
    name?: string;
    method: string;
    url: string;
    headers: any;
    body: any;
    expectedResponseSchema?: any;
}

interface ExecutionResult {
    id: string;
    status: number;
    duration: number;
    response: any;
    validationResult?: {
        valid: boolean;
        errors?: any[];
    };
}

const Requests: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [requests, setRequests] = useState<RequestModel[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RequestModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

    // Tab control
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'schema'>('body');

    useEffect(() => {
        fetchRequests();
    }, [projectId]);

    const fetchRequests = async () => {
        try {
            const response = await api.get(`/requests?projectId=${projectId}`);
            setRequests(response.data);
            if (response.data.length > 0 && !selectedRequest) {
                setSelectedRequest(response.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!selectedRequest) return;
        setExecuting(true);
        setLastResult(null);
        try {
            const response = await api.post(`/requests/${selectedRequest.id}/execute`);
            setLastResult(response.data);
        } catch (err) {
            console.error('Execution failed');
        } finally {
            setExecuting(false);
        }
    };

    const updateRequestField = (field: keyof RequestModel, value: any) => {
        if (!selectedRequest) return;
        setSelectedRequest({ ...selectedRequest, [field]: value });
    };

    const handleSave = async () => {
        if (!selectedRequest) return;
        try {
            await api.patch(`/requests/${selectedRequest.id}`, selectedRequest);
            // Update in list
            setRequests(requests.map(r => r.id === selectedRequest.id ? selectedRequest : r));
        } catch (err) {
            console.error('Failed to save');
        }
    };

    if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-[calc(100vh-160px)] gap-6">
            {/* Sidebar List */}
            <div className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white">Requests</span>
                    <button className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    {requests.map((req) => (
                        <button
                            key={req.id}
                            onClick={() => {
                                setSelectedRequest(req);
                                setLastResult(null);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${selectedRequest?.id === req.id
                                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                                }`}
                        >
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${req.method === 'GET' ? 'text-green-600 border-green-200 bg-green-50' :
                                    req.method === 'POST' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                                        'text-amber-600 border-amber-200 bg-amber-50'
                                }`}>
                                {req.method}
                            </span>
                            <span className="text-sm font-medium truncate">{req.name || req.url}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor & Results */}
            {selectedRequest ? (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* URL Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex gap-4 shadow-sm items-center">
                        <select
                            value={selectedRequest.method}
                            onChange={(e) => updateRequestField('method', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                            <option>DELETE</option>
                            <option>PATCH</option>
                        </select>
                        <input
                            type="text"
                            value={selectedRequest.url}
                            onChange={(e) => updateRequestField('url', e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                            placeholder="https://api.example.com/data"
                        />
                        <button
                            onClick={handleExecute}
                            disabled={executing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {executing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            Send
                        </button>
                    </div>

                    {/* Request Config */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 px-4">
                            {[
                                { id: 'body', label: 'Body', icon: FileJson },
                                { id: 'headers', label: 'Headers', icon: Settings },
                                { id: 'schema', label: 'Contract', icon: Code },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 p-4">
                            {activeTab === 'body' && (
                                <Editor
                                    value={typeof selectedRequest.body === 'string' ? selectedRequest.body : JSON.stringify(selectedRequest.body || {}, null, 2)}
                                    onChange={(val) => updateRequestField('body', val)}
                                    height="100%"
                                />
                            )}
                            {activeTab === 'headers' && (
                                <Editor
                                    value={typeof selectedRequest.headers === 'string' ? selectedRequest.headers : JSON.stringify(selectedRequest.headers || {}, null, 2)}
                                    onChange={(val) => updateRequestField('headers', val)}
                                    height="100%"
                                />
                            )}
                            {activeTab === 'schema' && (
                                <Editor
                                    value={typeof selectedRequest.expectedResponseSchema === 'string' ? selectedRequest.expectedResponseSchema : JSON.stringify(selectedRequest.expectedResponseSchema || {}, null, 2)}
                                    onChange={(val) => updateRequestField('expectedResponseSchema', val)}
                                    height="100%"
                                />
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={handleSave}
                                className="text-indigo-600 font-bold px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Response Result */}
                    {lastResult && (
                        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Activity size={16} className="text-slate-400" />
                                        <span className={`font-bold ${lastResult.status < 400 ? 'text-green-600' : 'text-red-600'}`}>
                                            {lastResult.status} Status
                                        </span>
                                    </div>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-sm font-medium text-slate-500">{lastResult.duration}ms</span>
                                </div>
                                {lastResult.validationResult && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${lastResult.validationResult.valid
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {lastResult.validationResult.valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        {lastResult.validationResult.valid ? 'Contract Valid' : 'Contract Failed'}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 p-4 grid grid-cols-2 gap-4 overflow-hidden">
                                <div className="flex flex-col h-full">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Response Data</span>
                                    <Editor
                                        value={JSON.stringify(lastResult.response.data, null, 2)}
                                        onChange={() => { }}
                                        readOnly={true}
                                        height="100%"
                                    />
                                </div>
                                <div className="flex flex-col h-full overflow-auto">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Validation Errors</span>
                                    {lastResult.validationResult?.errors ? (
                                        <div className="space-y-2">
                                            {lastResult.validationResult.errors.map((err, i) => (
                                                <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-mono">
                                                    <strong>{err.instancePath || 'root'}</strong>: {err.message}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                            {lastResult.validationResult?.valid ? 'No errors found.' : 'Validation results not available.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm italic text-slate-400">
                    Select a request or create a new one to start testing.
                </div>
            )}
        </div>
    );
};

export default Requests;
