# Relay — Visual Workflow Automation

**Design it. Run it. See exactly what happened.**

Relay is an interactive, deterministic workflow automation platform built as a client-facing demonstration. It shows how a business process can be modeled as data and executed visibly, node-by-node, with a fully inspectable trace.

## The Business Problem

Business teams often handle repetitive intake processes (e.g., lead qualification, support triage) manually or through opaque scripts. While production automation platforms exist, they are often too complex to evaluate quickly or too abstract to convey what "execution" actually feels like. 

Relay solves this by providing a small, self-contained artifact that demonstrates:
- Workflow-as-data
- Visible node-by-node execution
- Conditional branching with human-readable rationale
- Human-in-the-loop control
- Post-hoc traceability

## Demo Flow

Relay provides a complete **Inbound Lead Automation** demo scenario:
1. Select a deterministic scenario from the top navigation.
2. Click **Run Workflow**.
3. Watch the nodes execute sequentially. Edges animate to show data movement.
4. If a scenario requires a **Human Approval** step, the engine will pause and prompt for a decision.
5. After completion (or failure/retry), click on any node to view the **Execution Inspector** for full input, output, configuration, and timing data.
6. Open the **History** panel to view previous execution runs and revisit their traces.

### Deterministic Scenarios

To ensure a reliable and focused demo, Relay operates purely deterministically using synthetic data:
- **Scenario A (High-value enterprise lead):** High score → Routes to Human Approval → Approved → Enterprise assignment.
- **Scenario B (Medium-value lead):** Medium score → Routes directly to Standard Sales action.
- **Scenario C (Low-quality lead):** Low score → Routes to Nurture campaign.
- **Scenario D (Workflow failure & recovery):** Injects a simulated transient failure → Node visibly fails → Deterministic retry → Recovers & completes.

## Workflow Architecture

Relay is built as a single-process Next.js application designed for execution transparency and simplicity:
- **In-process Engine:** Interprets workflow data at runtime (synchronous/async evaluation).
- **React UI (`@xyflow/react`):** Only renders the state produced by the engine. It does not encode workflow logic.
- **SQLite Persistence:** Uses `better-sqlite3` to persist workflow definitions, execution state, and node traces natively.
- **Strict Data Model:** Workflows consist of Nodes and Edges. Every node execution is logged with timestamp, input, output, and status (`SUCCESS`, `FAILED`, `WAITING`, `SKIPPED`).

## Human Approval Mechanism

Human Approval is treated as a genuine engine state, not just a UI trick:
1. The execution engine persists an authoritative `WAITING_FOR_APPROVAL` state server-side.
2. Control is returned to the client; the execution loop suspends.
3. The UI queries this state and presents a modal.
4. An explicit API call to `/approve` verifies the suspended state, records the decision, and re-enters the execution engine to continue branching.

## Security Model

Relay prioritizes safety in its execution environment:
- **No `eval()` or `new Function()`:** Conditional logic is evaluated via a structured AST-like engine using strictly defined operators (`equals`, `greater_than`, `contains`, etc.).
- **Prototype Pollution Protection:** Context pathing (e.g., `score.leadScore`) blocks access to `__proto__`, `constructor`, and `prototype`.
- **Server-Authoritative States:** Client-side manipulation cannot bypass approval gates or forge successful runs.
- **No Remote Side Effects:** All action handlers (Email, CRM update, Task creation) are isolated "Demo Adapters" that output simulated results without touching the external network.

## E2E & Evaluation Results

Relay is continuously validated against the deterministic requirements:
- ✅ **Unit tests:** Condition engine safely evaluates all operators without prototype vulnerabilities.
- ✅ **Integration tests:** Complete engine runs validate Scenario A, B, C, and D node execution sequences.
- ✅ **Golden Path Validation:** Scenario A perfectly halts at `WAITING_FOR_APPROVAL`, successfully resumes on API approval, and registers `COMPLETED`.

## How to Run Locally

Relay requires zero external dependencies, queues, or API keys. 

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. The database (`relay.db`) will be automatically seeded on the first load.
