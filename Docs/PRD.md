# Relay — Product Requirements Document

**Status:** FUNCTIONAL DEMO / PROTOTYPE
**Subtitle:** Visual Workflow Automation
**Tagline:** Design it. Run it. See exactly what happened.

---

## 1. Product Summary

Relay is an interactive, intelligent workflow automation platform built as a portfolio/client demonstration. It shows how a business process — trigger → classification → enrichment → decision → action → human approval → completion — can be modeled as data and executed visibly, step by step, with a full inspectable trace.

Relay is **not** a production competitor to n8n, Zapier, Make, or Temporal. It is a small, polished, working prototype whose purpose is to make a viewer believe, within about two minutes, that their own repetitive business process could be automated this way.

## 2. Problem

Business teams handle repetitive intake processes (lead qualification, support triage, onboarding requests) manually or via opaque scripts. Existing automation platforms are either too complex to evaluate quickly in a sales/demo context, or too abstract (static diagrams) to convey what "execution" actually feels like. There is no small, self-contained artifact that demonstrates: workflow-as-data, visible node-by-node execution, conditional branching, human-in-the-loop control, and post-hoc traceability — all in one sitting, without external dependencies or API keys.

## 3. Target Users

- **Prospective clients / stakeholders** evaluating whether an automation partner understands their operational needs.
- **Technical evaluators** (CTOs, engineering leads) assessing architectural credibility.
- **Internal ops / sales teams** who want a concrete mental model of "what workflow automation actually does" before committing to a build.

## 4. Demo Scenario

**Inbound Customer/Lead Automation.** A synthetic inbound inquiry (name, company, email, message, source) enters the system. The workflow classifies it, enriches the company record, scores the lead, branches on score, drafts a response, optionally pauses for human approval, and simulates a final CRM/email action. All external effects are clearly labeled as simulated.

## 5. Goals

- Demonstrate workflow-as-data with a real execution engine (not a scripted animation).
- Make execution state visible node-by-node in near real time.
- Support conditional branching with a visible, explained rationale.
- Support a genuine human-in-the-loop pause/approve/reject step.
- Provide a full post-execution trace: input, output, timing, status, config per node.
- Demonstrate safe failure and deterministic retry.
- Be understandable end-to-end by a non-technical viewer in ~2 minutes.
- Run with zero external API keys and zero paid infrastructure.

## 6. Non-Goals

- Multi-tenant SaaS, billing, or org/user management.
- A full drag-and-drop visual editor with arbitrary node libraries.
- Real email delivery, real CRM writes, or real webhook ingestion from the public internet.
- Real LLM-based reasoning (optional, clearly labeled if added later).
- Distributed execution, queues, horizontal scaling, or durability guarantees beyond simple persistence.
- A large node type catalog / integration marketplace.

## 7. Primary User Journey

1. User lands on the Workflow Canvas and sees the predefined "Inbound Lead Automation" workflow rendered as connected nodes.
2. User selects a demo scenario (A–D) from the Scenario Selector.
3. User clicks **▶ RUN WORKFLOW**.
4. Nodes activate in sequence; edges animate to show data flow; each node settles into SUCCESS / FAILED / WAITING_FOR_APPROVAL.
5. If the workflow reaches a Human Approval node, execution pauses and an approval dialog appears showing the proposed action, lead score, and estimated value.
6. User approves or rejects; execution resumes down the corresponding path.
7. Workflow reaches COMPLETED (or FAILED, or RECOVERED-AFTER-RETRY).
8. User clicks any node in the trace to inspect input, output, timing, status, configuration, and error info if applicable.
9. User opens Workflow History to see past executions and reopen any prior trace.

## 8. Workflow Model

A workflow is data: `{ id, name, description, nodes[], edges[], status, createdAt, updatedAt }`. Nodes carry `{ id, type, name, configuration, position }`. Edges carry `{ source, target, condition }`. This model is interpreted by an execution engine at runtime — it is never hardcoded into UI components. See TECHNICAL_ARCHITECTURE.md for full schema.

## 9. Automation Capabilities

- Trigger ingestion (manual, simulated webhook, simulated schedule).
- Deterministic classification, enrichment, and scoring.
- Deterministic text generation for a response draft.
- Conditional routing based on scored fields.
- Simulated downstream actions (email, task, record update, notification), all labeled "Demo Adapter."

## 10. Conditional Branching

Branching is expressed as allow-listed condition objects (e.g., `{ field: "leadScore", operator: "greater_than", value: 80 }`), never as evaluated code. The engine evaluates each condition against the current execution context and records which branch was taken and why (field, operator, value, actual value) in the trace, so the viewer can see the reasoning, not just the outcome.

## 11. Human Approval

The Human Approval node is a first-class node type that pauses the execution state machine at `WAITING_FOR_APPROVAL`. It presents the proposed action, relevant scoring context, and Approve/Reject controls. Approval resumes the default outgoing edge; rejection follows a distinct "rejection path" edge (or a safe terminal state if none is defined). Both outcomes are timestamped and recorded in the execution trace.

## 12. Execution Trace

Every execution produces a full `Execution` record with per-node `NodeExecution` entries (status, timestamps, input, output, error). The trace is the signature feature: it must make every decision the workflow made — and why — inspectable after the fact.

## 13. Workflow History

A simple list of past executions (ID, status, duration, timestamp) that a user can click into to reopen the full trace of that run. No pagination complexity required for MVP — a bounded, deterministic set of demo executions is sufficient, plus any executions generated live in the session.

## 14. Demo Scenarios

| Scenario | Path | Outcome |
|---|---|---|
| A — High-value enterprise lead | Score ≥ 80 → Senior Sales → Human Approval | Approved → completed |
| B — Medium-value lead | 50 ≤ Score < 80 → Standard Sales | Auto-completed, no approval |
| C — Low-quality lead | Score < 50 → Nurture | Auto-completed, no approval |
| D — Workflow failure | Any route → simulated node failure | Retry simulation → recovered → completed |

The user can select or trigger any of these directly rather than relying on chance.

## 15. Success Criteria

- A first-time viewer can explain, unprompted, what happened during a run.
- Every completed node is clickable and shows real input/output data.
- Conditional branches visibly correspond to the scenario's data.
- The approval dialog blocks execution until a decision is made.
- A failure scenario visibly fails, retries, and recovers (or fails terminally) without crashing the UI.
- Zero external API calls are required to run the full demo.

## 16. Acceptance Criteria

- [ ] All four demo scenarios (A–D) are selectable and produce their documented outcomes deterministically.
- [ ] RUN WORKFLOW triggers a visible, sequential node-by-node execution animation.
- [ ] Every node type in the MVP library (§ Supported Node Types in architecture) executes via a real handler, not a hardcoded UI state.
- [ ] Conditions are evaluated via the safe expression model only — no `eval`, no dynamic code execution.
- [ ] Human Approval pauses execution and cannot be bypassed by client-side manipulation of visual state alone (server/engine holds authoritative status).
- [ ] Execution Inspector shows input, output, status, timing, and configuration for any node.
- [ ] Workflow History lists past executions and reopens their trace.
- [ ] All simulated integrations are labeled clearly ("Demo Adapter," "Simulated Webhook," etc.).
- [ ] Application runs with no required environment variables or API keys.

## 17. Future Improvements (explicitly out of MVP scope)

- Pluggable LLM-backed classifier/enricher/text generator (clearly labeled, optional).
- Visual drag-and-drop editor with live validation.
- Real adapter implementations behind a feature flag (real email/CRM providers).
- Multi-workflow library and versioning.
- Role-based approval routing.
- Persistent multi-user history (SQLite is sufficient for MVP; no multi-tenancy).

## 18. Assumptions

- A single demo workflow ("Inbound Lead Automation") is sufficient to prove the concept; multiple workflow templates are not required for MVP.
- All demo data is synthetic and safe to display without privacy concerns.
- The audience for the demo is primarily viewing on desktop; mobile responsiveness is a lower priority but not ignored.
- SQLite (or in-memory) persistence is acceptable; no external database service is required.

## 19. Open Decisions

- Whether execution history persists across server restarts (SQLite) or is in-memory only for MVP (reset on restart) — recommendation: SQLite for a more convincing demo, but in-memory is acceptable to ship faster.
- Whether the node palette allows adding/deleting nodes in MVP or is read-only with a "coming soon" affordance — recommendation: allow minimal add/delete/connect per spec, but do not invest heavily here.
- Exact retry count/backoff shown in Scenario D (recommendation: single deterministic retry, succeed on second attempt, for narrative clarity).


## 20. Evaluation & Quality Gate

### E2E Golden Path

Scenario A:

Open Relay
-> select High-value Enterprise Lead
-> RUN WORKFLOW
-> execution progresses
-> condition evaluated
-> Human Approval appears
-> approve
-> workflow completes
-> inspect execution trace

Verify the underlying final state, not merely visible UI elements.

### Evaluation scenarios

Evaluate A–D against deterministic expected outcomes.

Verify:
- node sequence
- branch selection
- approval behavior
- retry behavior
- final execution status

Do not fabricate accuracy metrics.
Report actual pass/fail results.

### 20.1 QUALITY GATE

Before declaring Relay complete:

[ ] Unit tests pass
[ ] Integration tests pass
[ ] E2E golden path passes
[ ] Scenario evaluation passes
[ ] Security tests pass
[ ] TypeScript passes
[ ] ESLint passes
[ ] Production build passes
[ ] No critical browser console errors
[ ] README updated
[ ] User-facing branding consistently says Relay
