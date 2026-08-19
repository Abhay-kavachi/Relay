import { v4 as uuidv4 } from 'uuid';
import { Workflow, Execution, NodeExecution } from '../types';
import { WorkflowRepository, ExecutionRepository, NodeExecutionRepository } from '../repositories';
import { handlers } from './handlers';
import { evaluateCondition } from './condition';

export class ExecutionEngine {
  
  async startExecution(workflowId: string, triggerPayload: Record<string, any>): Promise<string> {
    const workflow = WorkflowRepository.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    
    // Find trigger node
    const triggerNode = workflow.nodes.find(n => n.type === 'trigger.webhook');
    if (!triggerNode) throw new Error('No trigger node found');
    
    const execution: Execution = {
      id: uuidv4(),
      workflowId,
      status: 'RUNNING',
      currentNodeId: triggerNode.id,
      context: { trigger: triggerPayload },
      startedAt: Date.now()
    };
    
    ExecutionRepository.save(execution);
    
    // Start async execution in background
    // In a real production system this would be pushed to a queue
    // For this demo, we run it in-process asynchronously
    setTimeout(() => {
      this.run(execution, workflow).catch(err => {
        console.error('Engine error:', err);
      });
    }, 0);
    
    return execution.id;
  }

  async resumeExecution(executionId: string, approved: boolean, note?: string) {
    const execution = ExecutionRepository.get(executionId);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'WAITING_FOR_APPROVAL') throw new Error('Execution is not waiting for approval');
    
    const workflow = WorkflowRepository.get(execution.workflowId);
    if (!workflow) throw new Error('Workflow not found');
    
    // Find the node execution for the approval
    const nes = NodeExecutionRepository.getByExecutionId(executionId);
    const waitingNe = nes.find(ne => ne.status === 'WAITING' && ne.nodeId === execution.currentNodeId);
    
    if (waitingNe) {
      waitingNe.status = approved ? 'SUCCESS' : 'FAILED';
      waitingNe.output = { approved, note, decidedAt: Date.now() };
      waitingNe.completedAt = Date.now();
      waitingNe.durationMs = waitingNe.completedAt - waitingNe.startedAt;
      NodeExecutionRepository.save(waitingNe);
    }
    
    execution.context[execution.currentNodeId!] = { approved, note };
    
    if (!approved) {
      execution.status = 'REJECTED';
      execution.completedAt = Date.now();
      ExecutionRepository.save(execution);
      return;
    }
    
    execution.status = 'RUNNING';
    ExecutionRepository.save(execution);
    
    setTimeout(() => {
      // Find the next node after the approval node
      const nextEdge = workflow.edges.find(e => e.source === execution.currentNodeId);
      if (nextEdge) {
        execution.currentNodeId = nextEdge.target;
        ExecutionRepository.save(execution);
        this.run(execution, workflow).catch(console.error);
      } else {
        execution.status = 'COMPLETED';
        execution.completedAt = Date.now();
        ExecutionRepository.save(execution);
      }
    }, 0);
  }

  private async run(execution: Execution, workflow: Workflow) {
    let currentId = execution.currentNodeId;
    
    while (currentId && execution.status === 'RUNNING') {
      const node = workflow.nodes.find(n => n.id === currentId);
      if (!node) {
        execution.status = 'FAILED';
        ExecutionRepository.save(execution);
        return;
      }

      const nodeExecId = uuidv4();
      const nodeExec: NodeExecution = {
        id: nodeExecId,
        executionId: execution.id,
        nodeId: node.id,
        status: 'RUNNING',
        input: { ...execution.context },
        output: null,
        error: null,
        durationMs: null,
        startedAt: Date.now(),
        completedAt: null
      };
      
      NodeExecutionRepository.save(nodeExec);

      if (node.type === 'human.approval') {
        nodeExec.status = 'WAITING';
        NodeExecutionRepository.save(nodeExec);
        
        execution.status = 'WAITING_FOR_APPROVAL';
        ExecutionRepository.save(execution);
        return; // Suspend execution
      }

      let handlerError: string | null = null;
      let output: any = null;
      
      try {
        // Special logic for condition/switch nodes natively in engine
        if (node.type === 'logic.condition' || node.type === 'logic.switch') {
          const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
          let takenEdge = null;
          let evaluations = [];
          
          for (const edge of outgoingEdges) {
            if (!edge.condition) {
              if (!takenEdge) takenEdge = edge; // default path
              continue;
            }
            
            const { result, explanation } = evaluateCondition(edge.condition, execution.context);
            evaluations.push(explanation);
            
            if (result && !takenEdge) {
              takenEdge = edge;
            }
          }
          
          output = { 
            evaluations, 
            branchTaken: takenEdge ? takenEdge.target : null 
          };
          
          // The next currentId will be the takenEdge.target
          currentId = takenEdge ? takenEdge.target : null;
          
        } else {
          // Standard handler
          const handler = handlers[node.type];
          if (!handler) throw new Error(`No handler for ${node.type}`);
          
          // Simulate some processing time
          await new Promise(r => setTimeout(r, 600));
          
          // Scenario D simulated failure
          if (node.configuration.simulateFailure && !nodeExec.retried) {
             throw new Error("Simulated transient failure");
          }

          const result = await handler(node.configuration, execution.context);
          output = result.output;
        }
        
      } catch (err: any) {
        handlerError = err.message || 'Unknown error';
      }

      nodeExec.completedAt = Date.now();
      nodeExec.durationMs = nodeExec.completedAt - nodeExec.startedAt;

      if (handlerError) {
        nodeExec.status = 'FAILED';
        nodeExec.error = handlerError;
        NodeExecutionRepository.save(nodeExec);
        
        if (node.configuration.retry) {
           // Deterministic retry logic
           await new Promise(r => setTimeout(r, 1000));
           const retryExec: NodeExecution = {
             id: uuidv4(),
             executionId: execution.id,
             nodeId: node.id,
             status: 'RUNNING',
             input: { ...execution.context },
             output: null,
             error: null,
             durationMs: null,
             startedAt: Date.now(),
             completedAt: null,
             retried: true
           };
           NodeExecutionRepository.save(retryExec);
           
           try {
              const handler = handlers[node.type];
              const result = await handler(node.configuration, execution.context);
              output = result.output;
              retryExec.status = 'SUCCESS';
              retryExec.output = output;
           } catch(e: any) {
              retryExec.status = 'FAILED';
              retryExec.error = e.message;
              retryExec.completedAt = Date.now();
              retryExec.durationMs = retryExec.completedAt - retryExec.startedAt;
              NodeExecutionRepository.save(retryExec);
              
              execution.status = 'FAILED';
              execution.completedAt = Date.now();
              ExecutionRepository.save(execution);
              return;
           }
           
           retryExec.completedAt = Date.now();
           retryExec.durationMs = retryExec.completedAt - retryExec.startedAt;
           NodeExecutionRepository.save(retryExec);
        } else {
           execution.status = 'FAILED';
           execution.completedAt = Date.now();
           ExecutionRepository.save(execution);
           return;
        }
      } else {
        nodeExec.status = 'SUCCESS';
        nodeExec.output = output;
        NodeExecutionRepository.save(nodeExec);
      }

      // Add output to context
      if (output) {
        execution.context[node.id] = output;
        
        // Also spread it into context root if it has keys, for easier pathing
        // Wait, for safety, let's keep it scoped or spread well-known keys
        if (output.leadScore !== undefined) execution.context.leadScore = output.leadScore;
        if (output.classification !== undefined) execution.context.classification = output.classification;
        if (output.enriched !== undefined) execution.context.enriched = output.enriched;
      }
      
      if (node.type !== 'logic.condition' && node.type !== 'logic.switch') {
        const nextEdge = workflow.edges.find(e => e.source === node.id);
        currentId = nextEdge ? nextEdge.target : null;
      }
      
      execution.currentNodeId = currentId;
      ExecutionRepository.save(execution);
    }
    
    if (execution.status === 'RUNNING' && !currentId) {
      execution.status = 'COMPLETED';
      execution.completedAt = Date.now();
      ExecutionRepository.save(execution);
    }
  }
}

export const engine = new ExecutionEngine();
