import { Handle, Position } from '@xyflow/react';

export default function CustomNode({ data }: { data: any }) {
  const statusColors: Record<string, string> = {
    'SUCCESS': 'border-green-500 bg-green-50',
    'FAILED': 'border-red-500 bg-red-50',
    'WAITING': 'border-yellow-500 bg-yellow-50',
    'RUNNING': 'border-blue-500 bg-blue-50',
    'PENDING': 'border-slate-300 bg-white'
  };

  const statusColor = data.status ? statusColors[data.status] || statusColors.PENDING : statusColors.PENDING;
  
  // Minimal animation for running state
  const isRunning = data.status === 'RUNNING';

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 ${statusColor} ${isRunning ? 'animate-pulse' : ''} min-w-[180px]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400" />
      <div className="flex flex-col">
        <div className="text-sm font-bold text-slate-800">{data.label}</div>
        <div className="text-xs text-slate-500 font-mono mt-1">{data.type}</div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400" />
    </div>
  );
}
