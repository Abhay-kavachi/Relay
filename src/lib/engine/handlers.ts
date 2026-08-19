/* eslint-disable */
import { NodeType } from '../types';

export type NodeHandler = (
  config: Record<string, any>,
  context: Record<string, any>
) => Promise<{ output: Record<string, any> }>;

const triggerWebhookHandler: NodeHandler = async (config, context) => {
  return { output: context.webhookPayload || {} };
};

const logicClassifierHandler: NodeHandler = async (config, context) => {
  // Deterministic classification based on message content
  const message = context.trigger?.message || context.message || '';
  const messageStr = typeof message === 'string' ? message.toLowerCase() : '';
  
  let classification = 'General Inquiry';
  if (messageStr.includes('enterprise') || messageStr.includes('scale')) {
    classification = 'Enterprise Sales';
  } else if (messageStr.includes('support') || messageStr.includes('help') || messageStr.includes('bug')) {
    classification = 'Support';
  } else if (messageStr.includes('pricing') || messageStr.includes('cost')) {
    classification = 'Sales';
  }

  return { output: { classification } };
};

const logicEnricherHandler: NodeHandler = async (config, context) => {
  const company = context.trigger?.company || context.company || '';
  const companyStr = typeof company === 'string' ? company.toLowerCase() : '';
  
  let enriched = {
    employeeCount: 50,
    industry: 'Technology',
    annualRevenue: 1000000
  };

  if (companyStr === 'acme' || companyStr.includes('enterprise')) {
    enriched = {
      employeeCount: 5000,
      industry: 'Manufacturing',
      annualRevenue: 100000000
    };
  } else if (companyStr.includes('startup')) {
    enriched = {
      employeeCount: 10,
      industry: 'Software',
      annualRevenue: 100000
    };
  }

  return { output: { enriched } };
};

const logicScorerHandler: NodeHandler = async (config, context) => {
  // Score based on enriched data
  const enriched = context.logic_enricher?.enriched || context.enricher?.enriched || context.enriched || {};
  let score = 30; // base score

  const messageStr = typeof context.trigger?.message === 'string' ? context.trigger.message.toLowerCase() : '';
  if (messageStr.includes('standard') || messageStr.includes('pricing')) score += 30;

  if (enriched.employeeCount > 1000) score += 40;
  else if (enriched.employeeCount > 100) score += 20;

  if (enriched.annualRevenue > 10000000) score += 20;
  else if (enriched.annualRevenue > 500000) score += 10;

  return { output: { leadScore: Math.min(score, 100) } };
};

const actionEmailHandler: NodeHandler = async (config, context) => {
  return {
    output: {
      adapter: "Simulated Email",
      wouldSendTo: config.to || context.trigger?.email || "unknown@example.com",
      subject: config.subject || "Following up",
      note: "No real email was sent. This is a demo adapter."
    }
  };
};

const actionRecordUpdateHandler: NodeHandler = async (config, context) => {
  return {
    output: {
      adapter: "Simulated CRM Update",
      recordId: config.recordId || "REC-12345",
      fields: config.fields || {},
      note: "No CRM was updated. This is a demo adapter."
    }
  };
};

const actionTaskHandler: NodeHandler = async (config, context) => {
  return {
    output: {
      adapter: "Simulated Task Creation",
      assignee: config.assignee || "sales-queue",
      priority: config.priority || "High",
      note: "No task was created. This is a demo adapter."
    }
  };
};

// Handlers mapping
export const handlers: Record<NodeType, NodeHandler> = {
  'trigger.webhook': triggerWebhookHandler,
  'logic.classifier': logicClassifierHandler,
  'logic.enricher': logicEnricherHandler,
  'logic.scorer': logicScorerHandler,
  'logic.condition': async () => ({ output: {} }), // Evaluation handled natively by engine
  'logic.switch': async () => ({ output: {} }),
  'human.approval': async () => ({ output: {} }), // State transition handled natively by engine
  'action.email': actionEmailHandler,
  'action.record_update': actionRecordUpdateHandler,
  'action.task': actionTaskHandler
};
