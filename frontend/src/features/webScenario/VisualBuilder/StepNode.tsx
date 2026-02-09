import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MousePointer2, Type, Eye, CheckCircle2, ArrowRight } from 'lucide-react';

const icons = {
    CLICK: <MousePointer2 size={16} />,
    TYPE: <Type size={16} />,
    ASSERT_TEXT: <Eye size={16} />,
    ASSERT_VISIBLE: <Eye size={16} />,
    GOTO: <ArrowRight size={16} />,
    default: <CheckCircle2 size={16} />
};

export default memo(({ data }: any) => {
    const Icon = icons[data.type as keyof typeof icons] || icons.default;

    return (
        <div className="px-4 py-2 shadow-md rounded-md bg-[#1A1B1E] border-2 border-[#2C2E33] min-w-[150px]">
            <div className="flex items-center">
                <div className="rounded-full w-8 h-8 flex justify-center items-center bg-[#2C2E33] text-blue-400">
                    {Icon}
                </div>
                <div className="ml-2">
                    <div className="text-xs font-bold text-gray-200">{data.type}</div>
                    <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{data.label}</div>
                </div>
            </div>

            <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-blue-500" />
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-blue-500" />
        </div>
    );
});
