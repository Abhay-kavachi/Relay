/* eslint-disable */
export type WorkflowStatus = 'ACTIVE' | 'DRAFT';

export type NodeType = 
  | 'trigger.webhook' 
  | 'logic.classifier'
  | 'logic.enricher'
  | 'logic.scorer'
  | 'logic.condition'
  | 'logic.switch'
  | 'human.approval'
  | 'action.email'
  | 'action.record_update'
  | 'action.task';

export type NodeExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'WAITING';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  configuration: Record<string, any>;
  position?: { x: number; y: number };
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'greater_than_or_equal' 
  | 'less_than' 
  | 'less_than_or_equal' 
  | 'contains' 
  | 'in';

export interface ConditionExpression {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | (string | number)[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: ConditionExpression;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  currentNodeId?: string | null;
  context: Record<string, any>; // accumulated outputs
  startedAt: number;
  completedAt?: number | null;
}

export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  status: NodeExecutionStatus;
  input: Record<string, any>;
  output: Record<string, any> | null;
  error: string | null;
  durationMs: number | null;
  startedAt: number;
  completedAt: number | null;
  retried?: boolean;
}
