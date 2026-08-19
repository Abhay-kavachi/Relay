/* eslint-disable */
import { describe, it, expect, beforeAll } from 'vitest';
import { engine } from '@/lib/engine';
import { seedDatabase } from '@/lib/seed';
import { WorkflowRepository, ExecutionRepository, NodeExecutionRepository } from '@/lib/repositories';

// Helper to wait for execution to reach a terminal or waiting state
async function waitForExecution(executionId: string, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const exec = ExecutionRepository.get(executionId);
    if (!exec) throw new Error('Execution not found');
    if (['COMPLETED', 'FAILED', 'REJECTED', 'WAITING_FOR_APPROVAL'].includes(exec.status)) {
      return exec;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Execution timeout');
}

describe('Scenario Evaluation', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('Scenario A: High-value enterprise lead -> Approval -> Success', async () => {
    const id = await engine.startExecution('wf-demo-1', { 
      company: 'Acme Enterprise', 
      message: 'Looking for enterprise scale support' 
    });
    
    let exec = await waitForExecution(id);
    expect(exec.status).toBe('WAITING_FOR_APPROVAL');
    
    const nes = NodeExecutionRepository.getByExecutionId(id);
    const scoreNode = nes.find(n => n.nodeId === 'node-score');
    expect(scoreNode?.output?.leadScore).toBeGreaterThanOrEqual(80);
    
    // Approve it
    await engine.resumeExecution(id, true, 'Approved by test');
    
    exec = await waitForExecution(id);
    expect(exec.status).toBe('COMPLETED');
    
    // Verify enterprise action was taken
    const finalNes = NodeExecutionRepository.getByExecutionId(id);
    const enterpriseNode = finalNes.find(n => n.nodeId === 'node-action-enterprise');
    expect(enterpriseNode?.status).toBe('SUCCESS');
  });

  it('Scenario B: Medium-value lead -> Standard action', async () => {
    const id = await engine.startExecution('wf-demo-1', { 
      company: 'Startup', 
      message: 'Need standard pricing' 
    });
    
    const exec = await waitForExecution(id);
    expect(exec.status).toBe('COMPLETED');
    
    const nes = NodeExecutionRepository.getByExecutionId(id);
    const scoreNode = nes.find(n => n.nodeId === 'node-score');
    expect(scoreNode?.output?.leadScore).toBeGreaterThanOrEqual(50);
    expect(scoreNode?.output?.leadScore).toBeLessThan(80);
    
    const standardNode = nes.find(n => n.nodeId === 'node-action-standard');
    expect(standardNode?.status).toBe('SUCCESS');
  });

  it('Scenario C: Low-quality lead -> Nurture action', async () => {
    const id = await engine.startExecution('wf-demo-1', { 
      company: 'Unknown', 
      message: 'Hello' 
    });
    
    const exec = await waitForExecution(id);
    expect(exec.status).toBe('COMPLETED');
    
    const nes = NodeExecutionRepository.getByExecutionId(id);
    const scoreNode = nes.find(n => n.nodeId === 'node-score');
    expect(scoreNode?.output?.leadScore).toBeLessThan(50);
    
    const nurtureNode = nes.find(n => n.nodeId === 'node-action-nurture');
    expect(nurtureNode?.status).toBe('SUCCESS');
  });

  it('Scenario D: Failure and recovery', async () => {
    // For scenario D, we force a simulated failure by injecting configuration via DB,
    // or passing forceFailure flag to a node.
    // Wait, we need to test node retry logic.
    // Let's modify the node in DB temporarily.
    const wf = WorkflowRepository.get('wf-demo-1');
    const origNodes = [...wf.nodes];
    const targetNode = wf.nodes.find((n: any) => n.id === 'node-enrich');
    targetNode.configuration = { simulateFailure: true, retry: true };
    WorkflowRepository.save(wf);

    const id = await engine.startExecution('wf-demo-1', { 
      company: 'Startup', 
      message: 'Hello' 
    });
    
    const exec = await waitForExecution(id, 10000);
    expect(exec.status).toBe('COMPLETED'); // because it recovers
    
    const nes = NodeExecutionRepository.getByExecutionId(id);
    const enrichExecs = nes.filter(n => n.nodeId === 'node-enrich');
    
    expect(enrichExecs.length).toBeGreaterThanOrEqual(2); // Initial (failed) + Retry (success)
    expect(enrichExecs[0].status).toBe('FAILED');
    expect(enrichExecs[1].status).toBe('SUCCESS');
    expect(enrichExecs[1].retried).toBe(true);

    // Restore
    wf.nodes = origNodes;
    WorkflowRepository.save(wf);
  });
});
