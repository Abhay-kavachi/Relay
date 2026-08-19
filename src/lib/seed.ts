import { WorkflowRepository } from './repositories';
import { Workflow } from './types';

export function seedDatabase() {
  const defaultWorkflow: Workflow = {
    id: 'wf-demo-1',
    name: 'Inbound Lead Automation',
    description: 'Classifies, enriches, scores, and routes an inbound lead.',
    status: 'ACTIVE',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      { id: 'node-trigger', type: 'trigger.webhook', name: 'Inbound Lead', configuration: {}, position: { x: 50, y: 150 } },
      { id: 'node-classify', type: 'logic.classifier', name: 'Classify Message', configuration: {}, position: { x: 300, y: 150 } },
      { id: 'node-enrich', type: 'logic.enricher', name: 'Enrich Company', configuration: {}, position: { x: 550, y: 150 } },
      { id: 'node-score', type: 'logic.scorer', name: 'Score Lead', configuration: {}, position: { x: 800, y: 150 } },
      { id: 'node-condition', type: 'logic.condition', name: 'High Value?', configuration: {}, position: { x: 1050, y: 150 } },
      
      // High value path (Score >= 80)
      { id: 'node-human-approval', type: 'human.approval', name: 'Sales Director Approval', configuration: {}, position: { x: 1300, y: 50 } },
      { id: 'node-action-enterprise', type: 'action.record_update', name: 'Assign to Enterprise', configuration: { recordId: 'lead', fields: { owner: 'enterprise-team' } }, position: { x: 1550, y: 50 } },
      
      // Medium value path (50 <= Score < 80)
      { id: 'node-action-standard', type: 'action.task', name: 'Standard Sales Task', configuration: { assignee: 'standard-queue' }, position: { x: 1300, y: 150 } },
      
      // Low value path (Score < 50)
      { id: 'node-action-nurture', type: 'action.email', name: 'Add to Nurture Campaign', configuration: { subject: 'Thanks for your interest!' }, position: { x: 1300, y: 250 } }
    ],
    edges: [
      { id: 'edge-1', source: 'node-trigger', target: 'node-classify' },
      { id: 'edge-2', source: 'node-classify', target: 'node-enrich' },
      { id: 'edge-3', source: 'node-enrich', target: 'node-score' },
      { id: 'edge-4', source: 'node-score', target: 'node-condition' },
      
      // Condition branches
      { 
        id: 'edge-cond-high', 
        source: 'node-condition', 
        target: 'node-human-approval',
        condition: { field: 'leadScore', operator: 'greater_than_or_equal', value: 80 }
      },
      { 
        id: 'edge-cond-med', 
        source: 'node-condition', 
        target: 'node-action-standard',
        condition: { field: 'leadScore', operator: 'greater_than_or_equal', value: 50 } // actually need logic.switch for multiple ranges, but since conditions are evaluated in order, we can just say >= 50 and then fallback. Wait, condition engine takes the *first* matching edge.
      },
      { 
        id: 'edge-cond-low', 
        source: 'node-condition', 
        target: 'node-action-nurture'
        // No condition = default path
      },
      
      // Approval continuation
      { id: 'edge-approval-approved', source: 'node-human-approval', target: 'node-action-enterprise' }
    ]
  };

  const existing = WorkflowRepository.get('wf-demo-1');
  if (!existing) {
    WorkflowRepository.save(defaultWorkflow);
  }
}
