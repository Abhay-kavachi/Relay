'use client';

import { useState, useEffect } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Workflow, Execution, NodeExecution } from '@/lib/types';
import CustomNode from '@/components/CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

export default function Home() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const [execution, setExecution] = useState<Execution | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [scenario, setScenario] = useState('A');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<any>(null);

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        setWorkflow(data);
        const mappedNodes = data.nodes.map((n: any) => ({
          id: n.id,
          type: 'custom',
          position: n.position || { x: 0, y: 0 },
          data: { label: n.name, type: n.type, config: n.configuration }
        }));
        const mappedEdges = data.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: false,
          label: e.condition ? `${e.condition.field} ${e.condition.operator} ${e.condition.value}` : ''
        }));
        setNodes(mappedNodes);
        setEdges(mappedEdges);
      });
  }, []);

  useEffect(() => {
    if (!execution || ['COMPLETED', 'FAILED', 'REJECTED'].includes(execution.status)) return;
    
    const interval = setInterval(() => {
      fetch(`/api/executions/${execution.id}`)
        .then(r => r.json())
        .then(data => {
          setExecution(data.execution);
          setNodeExecutions(data.nodeExecutions);
          
          if (data.execution.status === 'WAITING_FOR_APPROVAL') {
            setApprovalDialog(data.execution);
          } else {
            setApprovalDialog(null);
          }
        });
    }, 500);
    
    return () => clearInterval(interval);
  }, [execution]);

  // Update nodes with execution status
  useEffect(() => {
    if (!nodeExecutions.length) return;
    
    setNodes(nds => nds.map(n => {
      // Find latest node execution for this node
      const ne = [...nodeExecutions].reverse().find(x => x.nodeId === n.id);
      if (ne) {
        return {
          ...n,
          data: { ...n.data, status: ne.status }
        };
      }
      return n;
    }));
    
    setEdges(eds => eds.map(e => {
      // Find if this edge was traversed
      const sourceNe = [...nodeExecutions].reverse().find(x => x.nodeId === e.source);
      let animated = false;
      let stroke = '#b1b1b7';
      
      if (sourceNe && sourceNe.status === 'SUCCESS') {
        if (sourceNe.output?.branchTaken === e.target || !sourceNe.output?.branchTaken) {
           animated = true;
           stroke = '#3b82f6';
        }
      }
      
      return { ...e, animated, style: { stroke, strokeWidth: 2 } };
    }));
    
  }, [nodeExecutions]);

  const runScenario = async () => {
    if (!workflow) return;
    
    setNodeExecutions([]);
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: undefined } })));
    setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { stroke: '#b1b1b7', strokeWidth: 2 } })));
    
    let payload = {};
    if (scenario === 'A') payload = { company: 'Acme Enterprise', message: 'Looking for enterprise scale support' };
    if (scenario === 'B') payload = { company: 'Startup', message: 'Looking for standard help' };
    if (scenario === 'C') payload = { company: 'Unknown', message: 'Hello' };
    if (scenario === 'D') payload = { company: 'Acme Enterprise', message: 'Looking for enterprise scale support', forceFailure: true };
    
    // Quick hack for scenario D failure in demo
    if (scenario === 'D') {
      const p = { ...payload };
      const res = await fetch('/api/workflows', { method: 'POST', body: JSON.stringify({ updateNode: 'node-enrich', simulateFailure: true }) });
      // In a real app we'd update the DB. For this demo, we'll let the backend handle it if we passed it in trigger?
      // Wait, let's just use the configuration in DB.
    }

    const res = await fetch(`/api/workflows/${workflow.id}/run`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    setExecution({ id: data.executionId, status: 'RUNNING' } as any);
  };

  const handleApprove = async (approved: boolean) => {
    if (!approvalDialog) return;
    await fetch(`/api/executions/${approvalDialog.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, note: approved ? 'Looks good' : 'Rejected by user' })
    });
    setApprovalDialog(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      {/* Left panel - Canvas */}
      <div className="flex-1 relative border-r border-slate-200 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-xl font-bold">Relay</h1>
            <p className="text-sm text-slate-500">Visual Workflow Automation</p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={scenario} 
              onChange={e => setScenario(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded text-sm bg-white"
            >
              <option value="A">A - High-value enterprise lead</option>
              <option value="B">B - Medium-value lead</option>
              <option value="C">C - Low-quality lead</option>
              <option value="D">D - Workflow failure + recovery</option>
            </select>
            <button 
              onClick={runScenario}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
            >
              Run Workflow
            </button>
            <button 
              onClick={() => setHistoryOpen(!historyOpen)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded border border-slate-300 hover:bg-slate-200 transition-colors"
            >
              History
            </button>
          </div>
        </div>
        
        <div className="flex-1">
          <ReactFlow 
            nodes={nodes} 
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Approval Modal */}
        {approvalDialog && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Human Approval Required</h2>
              <p className="text-sm text-slate-600 mb-4">
                The execution is paused. Please review the context and approve or reject.
              </p>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm font-mono mb-6 overflow-auto max-h-40">
                {JSON.stringify(approvalDialog.context, null, 2)}
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleApprove(false)}
                  className="px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel - Inspector */}
      <div className="w-96 bg-white flex flex-col h-full border-l border-slate-200">
        {historyOpen ? (
          <HistoryPanel onSelectExecution={(ex) => {
            setExecution(ex);
            setHistoryOpen(false);
          }} />
        ) : (
          <InspectorPanel 
            nodeId={selectedNodeId} 
            nodeExecutions={nodeExecutions} 
            workflow={workflow}
          />
        )}
      </div>
    </div>
  );
}

function InspectorPanel({ nodeId, nodeExecutions, workflow }: { nodeId: string | null, nodeExecutions: NodeExecution[], workflow: Workflow | null }) {
  if (!nodeId) {
    return (
      <div className="p-6 text-center text-slate-500 mt-20">
        Select a node to inspect its execution trace.
      </div>
    );
  }

  const node = workflow?.nodes.find(n => n.id === nodeId);
  const ne = [...nodeExecutions].reverse().find(n => n.nodeId === nodeId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-bold text-slate-900">{node?.name}</h2>
        <p className="text-xs text-slate-500 font-mono">{node?.type}</p>
        
        {ne && (
          <div className="mt-3 flex gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              ne.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
              ne.status === 'FAILED' ? 'bg-red-100 text-red-800' :
              ne.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {ne.status}
            </span>
            {ne.durationMs !== null && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                {ne.durationMs}ms
              </span>
            )}
            {ne.retried && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
                RETRIED
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-6 text-sm">
        <div>
          <h3 className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">Configuration</h3>
          <pre className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs overflow-x-auto text-slate-800">
            {JSON.stringify(node?.configuration || {}, null, 2)}
          </pre>
        </div>

        {ne?.input && (
          <div>
            <h3 className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">Input</h3>
            <pre className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs overflow-x-auto text-slate-800">
              {JSON.stringify(ne.input, null, 2)}
            </pre>
          </div>
        )}

        {ne?.output && (
          <div>
            <h3 className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">Output</h3>
            <pre className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs overflow-x-auto text-slate-800">
              {JSON.stringify(ne.output, null, 2)}
            </pre>
          </div>
        )}
        
        {ne?.error && (
          <div>
            <h3 className="font-semibold text-red-700 mb-2 uppercase text-xs tracking-wider">Error</h3>
            <pre className="bg-red-50 p-3 rounded border border-red-200 font-mono text-xs overflow-x-auto text-red-800 whitespace-pre-wrap">
              {ne.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPanel({ onSelectExecution }: { onSelectExecution: (ex: Execution) => void }) {
  const [history, setHistory] = useState<Execution[]>([]);

  useEffect(() => {
    fetch('/api/executions')
      .then(r => r.json())
      .then(data => setHistory(data));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-bold text-slate-900">Execution History</h2>
      </div>
      <div className="p-4 overflow-y-auto flex-1 space-y-2">
        {history.map(ex => (
          <div 
            key={ex.id}
            onClick={() => onSelectExecution(ex)}
            className="p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-slate-500">{new Date(ex.startedAt).toLocaleTimeString()}</span>
              <span className={`text-xs font-bold ${
                ex.status === 'COMPLETED' ? 'text-green-600' :
                ex.status === 'FAILED' ? 'text-red-600' :
                ex.status === 'WAITING_FOR_APPROVAL' ? 'text-yellow-600' :
                ex.status === 'REJECTED' ? 'text-orange-600' :
                'text-blue-600'
              }`}>
                {ex.status}
              </span>
            </div>
            <div className="text-xs text-slate-600 font-mono truncate">{ex.id}</div>
          </div>
        ))}
        {history.length === 0 && <div className="text-sm text-slate-500 text-center mt-10">No executions yet.</div>}
      </div>
    </div>
  );
}
