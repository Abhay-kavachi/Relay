# Relay — Frontend Specification

**Status:** FUNCTIONAL DEMO / PROTOTYPE

---

## Visual Direction

Modern automation command center: professional dark/light SaaS interface, clean workflow canvas, clear node hierarchy, strong and legible execution states, subtle (not decorative) animation, readable logs, generous spacing, minimal clutter. Avoid neon, meaningless gradients, glow-everything, childish motion, and generic "AI dashboard" clichés. Animation exists to communicate state changes (a node is now running, this edge just carried data), never purely for decoration.

---

## Main Screens

### 1. Workflow Canvas

**PURPOSE:** Show the workflow as connected nodes and serve as the primary execution surface.

**CONTENT:** Nodes rendered by type (icon + name + current state badge), edges drawn between them with directionality, a workflow header (name, description, status), the RUN WORKFLOW control, and a minimal node palette / add-connect-delete affordance for the limited MVP editor.

**ACTIONS:** Click RUN WORKFLOW to start an execution; click a node to open the Execution Inspector for it; drag to reposition a node (position persisted); add a node from the palette; delete a selected node; draw a connection between two nodes; edit a node's basic configuration via a lightweight side panel or modal.

**STATES:** Idle (no execution has run / most recent execution finished), Running (an execution is in progress — nodes/edges animate live), Waiting for Approval (canvas visibly indicates the paused node and surfaces the Approval Dialog), Completed, Failed, Empty (no workflow loaded — should not normally occur since a default workflow is always seeded).

**DATA DEPENDENCIES:** `GET /api/workflows/:id` for the definition; polled/streamed `GET /api/executions/:id` while `Running`/`WaitingForApproval` to drive node/edge state.

---

### 2. Execution Inspector

**PURPOSE:** Make a single node's execution fully transparent.

**CONTENT:** Selected node's name/type, status badge, configuration (read-only formatted view), input object, output object, duration in ms, and error details (message, timestamp) if the node failed. For a skipped branch node, shows the condition explanation ("leadScore (32) greater_than 80 → false — branch not taken").

**ACTIONS:** Select a different node without closing the panel; copy input/output as JSON; close the panel; (if the node is `human.approval` and currently pending) trigger the Human Approval Dialog directly from here.

**STATES:** No node selected (empty state with a prompt: "Select a node to inspect its execution"), node selected & pending (not yet run this execution), node selected & running (shimmer/loading indicator on the fields that aren't populated yet), node selected & success, node selected & failed, node selected & skipped.

**DATA DEPENDENCIES:** The relevant `NodeExecution` entry from the current `Execution` object already loaded for the canvas — no separate network call needed if the execution is already in view.

---

### 3. Execution History

**PURPOSE:** Let the user browse and reopen past executions.

**CONTENT:** A list of executions, most recent first, each showing execution ID, status icon (✓ completed / ⚠ completed-after-retry / ✕ failed / • waiting), and duration.

**ACTIONS:** Click an execution to load it into the Canvas + Inspector (read-only replay of that trace); the live/current execution (if any) is pinned or clearly marked at the top.

**STATES:** Empty (no executions yet — first-run state with a prompt to click RUN WORKFLOW), populated list, loading a selected execution's full trace.

**DATA DEPENDENCIES:** `GET /api/executions` for the list; `GET /api/executions/:id` when an entry is opened.

---

### 4. Workflow / Scenario Selector

**PURPOSE:** Let the user choose which synthetic inbound event to run through the workflow, so specific outcomes (A–D) can be demonstrated on demand rather than left to chance.

**CONTENT:** Four labeled scenario cards/buttons — High-Value Enterprise Lead, Medium-Value Lead, Low-Quality Lead, Simulated Failure & Recovery — each with a one-line description of the expected path.

**ACTIONS:** Select a scenario (sets the payload that RUN WORKFLOW will submit); optionally preview the raw synthetic input JSON for the selected scenario before running.

**STATES:** No scenario selected (RUN WORKFLOW disabled or defaults to Scenario A), scenario selected & idle, scenario selected & currently running (selector disabled to prevent overlapping runs).

**DATA DEPENDENCIES:** Scenario payloads are static/seeded client-side or fetched once from a small `GET /api/scenarios` endpoint; no per-keystroke network activity.

---

### 5. Human Approval Dialog

**PURPOSE:** Give the user real, blocking control over whether a sensitive action proceeds.

**CONTENT:** Modal titled "Human Approval Required," the proposed action description, key decision context (lead score, estimated value, routing), and two primary actions.

**ACTIONS:** Approve (resumes execution down the approved path); Reject (resumes execution down the rejection path or a safe terminal state); optionally add a short note before deciding.

**STATES:** Open & awaiting decision (blocks further canvas interaction with a scrim, but does not block viewing already-completed node results), submitting decision (buttons show a brief pending state), closed (decision recorded, canvas resumes animating).

**DATA DEPENDENCIES:** `POST /api/executions/:id/approve` with `{ approved: boolean, note?: string }`; on response, resumes polling `GET /api/executions/:id` to continue the animation.

---

## Node Appearance

Each node is a rounded rectangle card: icon (by category — trigger, transform, logic, action, human), name, a small type label, and a status badge in the corner. Category is communicated by icon + a subtle accent color, not by loud full-card color fills, keeping the canvas calm even mid-execution.

## Node States (visual)

| State | Treatment |
|---|---|
| Idle / Pending | Neutral border, muted icon, no badge |
| Running | Animated pulsing border or spinner badge; subtle motion only |
| Success | Solid check badge, calm accent border |
| Failed | Warning-color border, error badge (✕) |
| Waiting for Approval | Distinct badge (⚠) and a gentle persistent highlight so it reads as "needs you," not "broken" |
| Skipped | Reduced opacity, a small "skipped" label, dashed border |

## Edge States

Idle edges are a thin neutral line. When execution passes through an edge, it briefly animates (a traveling dash or a momentary highlight pulse) then settles into a "traversed" solid state distinct from untraversed edges, so after a run the whole taken path is visually legible at a glance. Untaken branches from a condition node remain in the idle/neutral style, clearly distinguishable from the traversed path.

## Execution Animation

Sequenced, not simultaneous: one node activates, briefly shows "running," resolves to its final state, its outgoing edge animates, then the next node activates. Total animated run should feel brisk (roughly 300–800ms per node, tunable) — enough to be legible, not so slow that a demo feels sluggish. The Human Approval pause is the one deliberate exception: it holds indefinitely until the user acts.

## Workflow Controls

RUN WORKFLOW (primary CTA, large, unmistakable), a secondary "Reset" control to clear the current run and return to Idle, and a disabled/loading state for RUN WORKFLOW while an execution is already in progress (no overlapping runs in MVP).

## RUN Button

Large, high-contrast, labeled "▶ RUN WORKFLOW." Disabled with a tooltip if no scenario is selected. Shows a brief "Starting…" state immediately on click before the first node begins animating, so there is no dead air.

## Pause / Stop Behavior

The only "pause" in MVP is the engine-driven Human Approval suspension — there is no arbitrary user-initiated pause/stop mid-execution for MVP, to keep the state machine simple. This is a documented scope limit, not an oversight.

## Error State

A failed node shows its error message directly in the Inspector; the Canvas shows the failed node with its warning styling and, if a retry occurs, a brief "retrying…" transitional state before resolving to Success (recovered) or Failed (terminal). The overall execution banner reflects `FAILED` clearly if the run does not recover.

## Retry State

Visually distinct from a fresh run: the node shows a small "retry 1/1" indicator during the retry attempt, and its final Success state (if recovered) carries a small "recovered after retry" tag both on the canvas and in the Inspector/History list (matching the "⚠ Completed after retry" pattern from the PRD).

## Approval State

Covered under Human Approval Dialog above; the Canvas node itself also shows the ⚠ badge for the duration of the wait so a user glancing at the canvas (dialog dismissed/backgrounded) still understands execution is paused.

## Loading States

Skeleton/shimmer placeholders for the Inspector fields while a node is `Running`; a lightweight spinner on RUN WORKFLOW immediately after click; a skeleton list for Execution History while it loads.

## Empty States

- Execution History with no runs yet: prompt to run the workflow.
- Inspector with no node selected: prompt to select a node.
- (Not expected in normal use) Canvas with no workflow loaded: a clear error/empty message rather than a blank screen.

## Responsive Behavior

Primary target is desktop/laptop viewing for a live demo. At minimum, the layout degrades gracefully on a tablet-width viewport: Inspector and History collapse into tabs/drawers rather than fixed side panels, and the canvas remains scrollable/zoomable. Full mobile-optimized editing is out of scope for MVP; mobile should still be able to view a read-only trace.

## Accessibility

Status is never communicated by color alone — every state badge pairs a color with an icon and/or short text label (✓, ⚠, ✕, etc., matching the PRD's own notation). All interactive elements (RUN button, node cards, approval buttons, history rows) are real focusable, keyboard-activatable elements with visible focus states and appropriate ARIA roles/labels (e.g., the Approval Dialog is a proper modal with focus trap and `aria-modal`).

## Keyboard Controls

Tab/Shift+Tab moves through nodes, controls, and history rows in a sensible order; Enter/Space activates the focused control (including opening a node's Inspector or activating RUN); Escape closes the Approval Dialog only when a decision is not required to proceed being clear that dismissing does not equal rejecting — recommend Escape does *not* close the Approval Dialog, to avoid an accidental no-op state, and this is called out as a deliberate exception to typical modal conventions.

## Visual Hierarchy

RUN WORKFLOW and the currently-active/attention-needed node (e.g., Waiting for Approval) are always the most visually prominent elements on screen. Secondary chrome (History, palette) recedes in weight. The Inspector is prominent only when a node is selected, keeping the canvas the star of the experience.
