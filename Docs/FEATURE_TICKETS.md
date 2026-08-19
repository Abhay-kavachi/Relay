# Relay — Feature Tickets

**Status:** FUNCTIONAL DEMO / PROTOTYPE

Legend: **P0** = MVP (required for the signature experience to work end-to-end). **P1** = Important, strengthens the demo. **P2** = Future / explicitly out of MVP scope.

---

## P0 — MVP

### FLOW-001 — Project Foundation
**Objective:** Stand up the base Next.js + TypeScript + Tailwind app with linting, formatting, and CI.
**Description:** Initialize the repository with Next.js App Router, TypeScript strict mode, Tailwind, ESLint, and Prettier. Set up a CI pipeline running lint, typecheck, and tests on push.
**Dependencies:** None.
**Implementation Notes:** Keep dependency footprint minimal per architecture (no state library, no CSS-in-JS beyond Tailwind). Add an ESLint rule/CI check forbidding `eval(`, `new Function(`, and `dangerouslySetInnerHTML`.
**Acceptance Criteria:** Fresh clone builds and runs with a single install command and no required environment variables; CI passes on an empty/base commit.
**Testing Requirements:** CI smoke test that `npm run build` succeeds.
**Security Considerations:** Establish the forbidden-API lint rule now so it applies to all future code.

---

### FLOW-002 — Core Data Models
**Objective:** Define TypeScript types and validation schemas for Workflow, Node, Edge, Execution, and NodeExecution.
**Description:** Implement the data model from TECHNICAL_ARCHITECTURE.md as TypeScript types plus Zod (or equivalent) schemas for runtime validation.
**Dependencies:** FLOW-001.
**Implementation Notes:** Co-locate types and schemas; export a single source of truth used by both API routes and the engine.
**Acceptance Criteria:** All five entities are represented; schemas reject malformed shapes (missing required fields, wrong types, unknown node types).
**Testing Requirements:** Unit tests covering valid and invalid payloads for each schema.
**Security Considerations:** Schemas explicitly reject `__proto__`/`constructor`/`prototype` as field/key names anywhere they could be user-supplied.

---

### FLOW-003 — Persistence Layer
**Objective:** Implement `WorkflowRepository` and `ExecutionRepository` interfaces with a SQLite implementation (and in-memory fallback).
**Description:** CRUD for workflows and executions behind repository interfaces so the engine and API never depend on the storage mechanism directly.
**Dependencies:** FLOW-002.
**Implementation Notes:** Use parameterized queries exclusively; no string-built SQL.
**Acceptance Criteria:** Workflows and executions survive a server restart when SQLite is used; the in-memory fallback satisfies the same interface for zero-setup runs.
**Testing Requirements:** Repository unit tests against both implementations using a shared test-suite contract.
**Security Considerations:** No string concatenation into queries; verified via a targeted injection test using a malicious-looking node name.

---

### FLOW-004 — Seeded Demo Workflow Definition
**Objective:** Author the "Inbound Lead Automation" workflow as data (nodes, edges, positions) matching the diagram in the PRD.
**Description:** Create the seed script/fixture that inserts the default workflow (trigger → classify → enrich → score → condition → generate → human approval → action → complete) on first run.
**Dependencies:** FLOW-002, FLOW-003.
**Implementation Notes:** Node positions should be pre-laid-out for a clean default canvas view (no auto-layout algorithm required for MVP).
**Acceptance Criteria:** A fresh database boots with exactly this workflow present and loadable via the API.
**Testing Requirements:** Integration test asserting the seeded workflow passes workflow validation (FLOW-011).
**Security Considerations:** N/A (trusted, developer-authored data).

---

### FLOW-005 — Deterministic Scenario Fixtures (A–D)
**Objective:** Implement the four fixed scenario payloads and any scenario-specific handler behavior (e.g., forced first-attempt failure for Scenario D).
**Description:** Define Scenario A–D input payloads exactly as specified in the PRD, plus the deterministic logic needed so each reliably produces its documented path (score thresholds, forced failure/retry for D).
**Dependencies:** FLOW-002.
**Implementation Notes:** Keep "randomness" (e.g., enrichment lookups) derived deterministically from input data, never `Math.random()`.
**Acceptance Criteria:** Running each scenario through the engine (once built) produces the exact documented node sequence and final status every time.
**Testing Requirements:** Snapshot-style integration tests per scenario.
**Security Considerations:** Scenario payloads still pass through the same untrusted-input validation as any execution start payload — no special-cased bypass.

---

### FLOW-006 — Workflow Execution Engine Core
**Objective:** Implement the engine that walks a workflow graph and produces an Execution + NodeExecution trace.
**Description:** Build the interpreter described in TECHNICAL_ARCHITECTURE.md §8: load workflow, create Execution, walk nodes via taken edges, maintain execution context, persist NodeExecution results, resolve final Execution status.
**Dependencies:** FLOW-002, FLOW-003, FLOW-004.
**Implementation Notes:** Engine is a pure, testable module independent of Next.js request/response concerns — API routes are a thin wrapper around it.
**Acceptance Criteria:** Given the seeded workflow and Scenario A input, the engine produces a complete, correctly-ordered trace ending in `COMPLETED`.
**Testing Requirements:** Unit tests for graph-walking logic in isolation from real handlers (using stub handlers).
**Security Considerations:** Engine never evaluates any string as code; graph traversal is bounded (cycle-checked at validation time, FLOW-011) to prevent infinite loops.

---

### FLOW-007 — Node Handlers (Transform & Trigger)
**Objective:** Implement handlers for trigger nodes and the transform/intelligence nodes (Classify, Extract, Enrich, Score, Generate Text) as deterministic implementations behind `Classifier`/`Enricher`/`Scorer`/`TextGenerator` interfaces.
**Description:** Implement `DeterministicClassifier`, `DemoEnricher`, `DeterministicScorer`, `DeterministicTextGenerator` per the architecture doc.
**Dependencies:** FLOW-006.
**Implementation Notes:** Keep each handler pure and unit-testable independent of the engine; no network calls.
**Acceptance Criteria:** Each handler produces correct, documented output for all four scenario inputs.
**Testing Requirements:** Unit tests per handler covering typical and edge-case inputs (e.g., unknown company for Enricher).
**Security Considerations:** No `eval`/dynamic code in text generation; templates use safe placeholder substitution only.

---

### FLOW-008 — Condition Engine (Safe Expression Evaluator)
**Objective:** Implement the allow-listed condition evaluator used by `logic.condition` and `logic.switch` nodes.
**Description:** Build the evaluator per TECHNICAL_ARCHITECTURE.md §10 and SECURITY_AND_ACCESS.md §7 — strict field-path resolution, enumerated operator switch, human-readable explanation output.
**Dependencies:** FLOW-002.
**Implementation Notes:** No `eval`, `new Function`, or dynamic code execution anywhere in this module — this is the single most security-sensitive component in the system.
**Acceptance Criteria:** Correctly evaluates all documented operators; rejects unknown operators and disallowed field paths (`__proto__`, etc.) with a clear error rather than throwing an unhandled exception.
**Testing Requirements:** Exhaustive unit tests per operator, plus explicit tests asserting rejection of prototype-pollution-style field paths and of any attempt to pass code as a value.
**Security Considerations:** This ticket directly implements the "never use eval()" requirement; code review must specifically verify no dynamic evaluation was introduced.

---

### FLOW-009 — Node Handlers (Logic & Action)
**Objective:** Implement `logic.condition`, `logic.switch`, and the demo action handlers (Send Email, Create Task, Update Record, Notification).
**Description:** Logic handlers delegate branch selection to the Condition Engine (FLOW-008). Action handlers construct clearly-labeled "Demo Adapter" output with no real side effects.
**Dependencies:** FLOW-006, FLOW-008.
**Implementation Notes:** Every action handler's output includes an `adapter` name and a "no real action was taken" note, per SECURITY_AND_ACCESS.md §15/PRD honesty rule.
**Acceptance Criteria:** Branching correctly selects the documented path for each scenario; action outputs are visibly labeled as simulated.
**Testing Requirements:** Unit tests confirming action handlers make zero network calls (mock/spy assertion) and always include the required labeling fields.
**Security Considerations:** Confirms the "do not pretend emails were sent" honesty rule is structurally enforced, not just a UI label.

---

### FLOW-010 — Human Approval Suspend/Resume
**Objective:** Implement the engine-level suspend at a `human.approval` node and the resume path via approve/reject.
**Description:** Engine sets `Execution.status = WAITING_FOR_APPROVAL` and persists the pending node id; a separate resume entry point re-enters the engine at that point once a decision is recorded.
**Dependencies:** FLOW-006, FLOW-003.
**Implementation Notes:** Resume logic must re-hydrate the exact execution context that existed at suspension time from persistence — do not rely on in-memory state surviving a server restart.
**Acceptance Criteria:** Scenario A pauses at Human Approval, and both an approve and a reject path correctly resume execution down the corresponding edge.
**Testing Requirements:** Integration test covering suspend → (simulated server restart) → resume, to prove state is durable, not just in-memory.
**Security Considerations:** Resume endpoint validates the execution is actually in `WAITING_FOR_APPROVAL` for the claimed node before honoring a decision (see FLOW-016).

---

### FLOW-011 — Workflow & Node Configuration Validation
**Objective:** Implement structural workflow validation (DAG check, edge reference integrity, required edge labels) and per-node-type configuration schema validation.
**Description:** Per SECURITY_AND_ACCESS.md §5–6: validate at save time and again at execution time (defense in depth).
**Dependencies:** FLOW-002.
**Implementation Notes:** Validation errors must be specific enough to be actionable ("edge X references missing node Y"), not a generic failure.
**Acceptance Criteria:** The seeded workflow (FLOW-004) passes validation; a deliberately malformed workflow (dangling edge, cycle, missing trigger) is rejected with a clear error.
**Testing Requirements:** Unit tests for each validation rule, including at least one adversarial fixture per rule.
**Security Considerations:** This ticket is a primary defense against malformed/malicious workflow definitions reaching the engine.

---

### FLOW-012 — Workflow API Routes
**Objective:** Implement `GET /api/workflows/:id`, `POST /api/workflows/:id/executions`, `GET /api/executions/:id`, `GET /api/executions`, `POST /api/executions/:id/approve`.
**Description:** Thin API layer wrapping the engine and repositories, with request validation per SECURITY_AND_ACCESS.md §4.
**Dependencies:** FLOW-003, FLOW-006, FLOW-010, FLOW-011.
**Implementation Notes:** Keep route handlers thin; business logic lives in the engine, not in route files.
**Acceptance Criteria:** All five endpoints function against the seeded workflow and produce responses matching the data model.
**Testing Requirements:** API integration tests for happy paths and validation-failure paths for each route.
**Security Considerations:** Every route validates its input against a schema before touching the engine or persistence; approval route specifically checked in FLOW-016.

---

### FLOW-013 — Workflow Canvas Rendering
**Objective:** Build the React canvas that renders nodes and edges generically from workflow data.
**Description:** Per FRONTEND_SPEC.md — node cards keyed by `type`, edges drawn between positions, no workflow logic embedded in components.
**Dependencies:** FLOW-012.
**Implementation Notes:** A single style/icon metadata map keyed by node type; adding a node type should require no canvas code changes beyond a metadata entry.
**Acceptance Criteria:** The seeded workflow renders correctly with all 9 nodes and their connecting edges in the documented layout.
**Testing Requirements:** Component test rendering a sample workflow and asserting all nodes/edges appear.
**Security Considerations:** Node names/config rendered via React text interpolation only — verified no `dangerouslySetInnerHTML` usage (enforced by the FLOW-001 lint rule).

---

### FLOW-014 — Execution Animation & Live State Polling
**Objective:** Drive the canvas's live node/edge state from a running execution via polling (or SSE) of `GET /api/executions/:id`.
**Description:** On RUN WORKFLOW, start the execution server-side, then poll/stream status and animate nodes/edges sequentially per FRONTEND_SPEC.md's Execution Animation section.
**Dependencies:** FLOW-012, FLOW-013.
**Implementation Notes:** Animation timing (~300–800ms/node) is a tunable constant, not hardcoded per node.
**Acceptance Criteria:** Running Scenario A visibly animates through all nodes to the Human Approval pause, and resumes correctly after a decision.
**Testing Requirements:** UI test simulating a full scenario run and asserting the final rendered state matches the expected trace.
**Security Considerations:** N/A beyond standard API validation already covered.

---

### FLOW-015 — Execution Inspector Panel
**Objective:** Build the node inspector showing input, output, status, timing, and configuration for a selected node.
**Description:** Per FRONTEND_SPEC.md screen 2, including the skipped-branch explanation display.
**Dependencies:** FLOW-013, FLOW-014.
**Implementation Notes:** Reads from the already-loaded Execution object; no extra network round-trip per node click.
**Acceptance Criteria:** Clicking any executed node shows accurate input/output/timing/status matching what the engine actually produced.
**Testing Requirements:** Component test asserting displayed values match a fixture NodeExecution object.
**Security Considerations:** Same text-rendering-only rule as FLOW-013.

---

### FLOW-016 — Human Approval Dialog & Authorization Check
**Objective:** Build the blocking approval modal and wire it to the resume endpoint, including the server-side authoritative check.
**Description:** Per FRONTEND_SPEC.md screen 5 and SECURITY_AND_ACCESS.md §17. Critically, the server must independently verify `WAITING_FOR_APPROVAL` state before honoring a decision — the dialog appearing client-side is never sufficient authorization on its own.
**Dependencies:** FLOW-010, FLOW-012, FLOW-014.
**Implementation Notes:** Disable canvas interaction (scrim) while the dialog is open, per spec; Escape does not dismiss without a decision.
**Acceptance Criteria:** Approve/Reject both correctly resume the engine; a forged/duplicate approval call against an already-resolved execution is rejected with a clear error, not silently accepted.
**Testing Requirements:** API test sending an approval call twice for the same node, asserting the second call is rejected.
**Security Considerations:** This ticket is the concrete implementation of "the client cannot fabricate an approved execution" from the architecture doc.

---

### FLOW-017 — Execution History List
**Objective:** Build the history list and the ability to reopen a past execution's trace read-only.
**Description:** Per FRONTEND_SPEC.md screen 3, including the "⚠ Completed after retry" status pattern.
**Dependencies:** FLOW-012, FLOW-013, FLOW-015.
**Implementation Notes:** Reopening a past execution loads it into the same Canvas/Inspector components used for a live run, in a read-only (non-animating) mode.
**Acceptance Criteria:** After running Scenarios A–D once each, all four appear in history with correct status icons and can be reopened to show their full trace.
**Testing Requirements:** Integration test running all four scenarios then asserting history contents and reopening behavior.
**Security Considerations:** N/A beyond standard API validation already covered.

---

### FLOW-018 — Error & Retry Simulation (Scenario D)
**Objective:** Implement the deterministic single-retry failure/recovery path end-to-end, visible in both the trace and the UI.
**Description:** A designated node in Scenario D fails on first attempt, the engine performs one deterministic retry, and the UI shows the "retry 1/1" transitional state before resolving to recovered-Success.
**Dependencies:** FLOW-006, FLOW-007, FLOW-014, FLOW-015.
**Implementation Notes:** Failure/retry behavior must be deterministic (tied to the scenario input), not probabilistic, so it is reproducible in every demo run.
**Acceptance Criteria:** Running Scenario D always fails once, retries once, recovers, and the History entry reads "⚠ Completed after retry."
**Testing Requirements:** Integration test asserting the exact NodeExecution sequence (`FAILED` → `RUNNING` (retry) → `SUCCESS`) for the designated node.
**Security Considerations:** Error messages surfaced in the UI are sanitized/text-rendered only, never raw stack traces or internal paths.

---

## P1 — Important

- **FLOW-019** — Minimal workflow editing: add node, delete node, connect nodes, edit basic node configuration via a side panel (per PRD §14's "acceptable" MVP editor scope, not a full visual editor).
- **FLOW-020** — Scenario preview: show the raw synthetic input JSON for a selected scenario before running it.
- **FLOW-021** — Responsive/tablet layout: collapse Inspector/History into drawers per FRONTEND_SPEC.md's responsive section.
- **FLOW-022** — Accessibility pass: keyboard navigation audit, ARIA roles/labels, focus management for the Approval Dialog.
- **FLOW-023** — Copy-as-JSON affordance in the Execution Inspector.
- **FLOW-024** — Security regression test suite consolidation (a single CI job running all condition-engine, validation, and injection-style tests from SECURITY_AND_ACCESS.md §18).
- **FLOW-025** — Reset control to clear the current run and return the canvas to Idle without a full page reload.

## P2 — Future

- **FLOW-026** — Pluggable LLM-backed `Classifier`/`Enricher`/`TextGenerator` implementations behind a feature flag, clearly labeled in the UI when active, with graceful fallback to deterministic implementations when no API key is present.
- **FLOW-027** — Full drag-and-drop visual editor with live validation feedback.
- **FLOW-028** — Real adapter implementations (real email/CRM providers) behind an explicit, separately-secured "live mode" toggle — out of scope for the demo product entirely unless a specific future requirement calls for it.
- **FLOW-029** — Multi-workflow library, templates, and versioning.
- **FLOW-030** — Authentication/authorization layer, required before any real (non-synthetic) data or real approval actions could ever be introduced.
- **FLOW-031** — Role-based approval routing (different approvers for different value thresholds).
