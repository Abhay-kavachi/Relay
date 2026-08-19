/* eslint-disable */
import { getDb } from './db';
import { Workflow, Execution, NodeExecution } from './types';

export const WorkflowRepository = {
  save(workflow: Workflow) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO workflows (id, name, description, nodes, edges, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        nodes=excluded.nodes,
        edges=excluded.edges,
        status=excluded.status,
        updatedAt=excluded.updatedAt
    `);
    
    stmt.run(
      workflow.id,
      workflow.name,
      workflow.description,
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.edges),
      workflow.status,
      workflow.createdAt,
      workflow.updatedAt
    );
  },

  get(id: string): Workflow | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      nodes: JSON.parse(row.nodes),
      edges: JSON.parse(row.edges),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
};

export const ExecutionRepository = {
  save(execution: Execution) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO executions (id, workflowId, status, currentNodeId, context, startedAt, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status=excluded.status,
        currentNodeId=excluded.currentNodeId,
        context=excluded.context,
        completedAt=excluded.completedAt
    `);
    
    stmt.run(
      execution.id,
      execution.workflowId,
      execution.status,
      execution.currentNodeId,
      JSON.stringify(execution.context),
      execution.startedAt,
      execution.completedAt
    );
  },

  get(id: string): Execution | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM executions WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      workflowId: row.workflowId,
      status: row.status,
      currentNodeId: row.currentNodeId,
      context: JSON.parse(row.context),
      startedAt: row.startedAt,
      completedAt: row.completedAt
    };
  },

  updateStatus(id: string, status: string, currentNodeId?: string | null, context?: Record<string, any>) {
    const db = getDb();
    if (context) {
       const stmt = db.prepare('UPDATE executions SET status = ?, currentNodeId = ?, context = ? WHERE id = ?');
       stmt.run(status, currentNodeId, JSON.stringify(context), id);
    } else {
       const stmt = db.prepare('UPDATE executions SET status = ?, currentNodeId = ? WHERE id = ?');
       stmt.run(status, currentNodeId, id);
    }
  },

  getHistory(): Execution[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM executions ORDER BY startedAt DESC LIMIT 50').all() as any[];
    return rows.map(row => ({
      id: row.id,
      workflowId: row.workflowId,
      status: row.status,
      currentNodeId: row.currentNodeId,
      context: JSON.parse(row.context),
      startedAt: row.startedAt,
      completedAt: row.completedAt
    }));
  }
};

export const NodeExecutionRepository = {
  save(ne: NodeExecution) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO node_executions (id, executionId, nodeId, status, input, output, error, durationMs, startedAt, completedAt, retried)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status=excluded.status,
        output=excluded.output,
        error=excluded.error,
        durationMs=excluded.durationMs,
        completedAt=excluded.completedAt,
        retried=excluded.retried
    `);
    
    stmt.run(
      ne.id,
      ne.executionId,
      ne.nodeId,
      ne.status,
      JSON.stringify(ne.input),
      ne.output ? JSON.stringify(ne.output) : null,
      ne.error,
      ne.durationMs,
      ne.startedAt,
      ne.completedAt,
      ne.retried ? 1 : 0
    );
  },
  
  getByExecutionId(executionId: string): NodeExecution[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM node_executions WHERE executionId = ? ORDER BY startedAt ASC').all(executionId) as any[];
    return rows.map(row => ({
      id: row.id,
      executionId: row.executionId,
      nodeId: row.nodeId,
      status: row.status,
      input: JSON.parse(row.input),
      output: row.output ? JSON.parse(row.output) : null,
      error: row.error,
      durationMs: row.durationMs,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      retried: row.retried === 1
    }));
  }
};
