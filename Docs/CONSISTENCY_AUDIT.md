# Relay — Consistency Audit

**Status:** FUNCTIONAL DEMO / PROTOTYPE
**Scope:** Cross-check of PRD.md ↕ TECHNICAL_ARCHITECTURE.md ↕ SECURITY_AND_ACCESS.md ↕ FRONTEND_SPEC.md ↕ FEATURE_TICKETS.md

---

## 1. Feature Traceability Table

| Requirement (PRD) | Architecture | Security | Frontend | Ticket(s) | Status |
|---|---|---|---|---|---|
| Workflow-as-data model | §5–7 (Workflow/Node/Edge types) | §5–6 (validation) | Canvas renders generically by type | FLOW-002, FLOW-004 | ✅ Covered |
| RUN WORKFLOW signature interaction | §8 engine walk | §4 input validation of start payload | Screen 1, RUN Button section | FLOW-006, FLOW-012, FLOW-014 | ✅ Covered |
| Node-by-node execution states | §8, §12 state machine | — | Node States table | FLOW-006, FLOW-013, FLOW-014 | ✅ Covered |
| Conditional branching w/ visible rationale | §10 Condition Engine | §7 Expression Safety | Skipped-branch explanation in Inspector | FLOW-008, FLOW-015 | ✅ Covered |
| Human Approval pause/resume | §11 | §17 (authoritative server-side check) | Screen 5 | FLOW-010, FLOW-016 | ✅ Covered |
| Execution Trace (input/output/timing/status/config) | §9, §12–13 | — | Screen 2 | FLOW-015 | ✅ Covered |
| Workflow History | §13 | — | Screen 3 | FLOW-017 | ✅ Covered |
| Scenarios A–D deterministic | §16 | §4 (still validated) | Screen 4 | FLOW-005, FLOW-018 | ✅ Covered |
| Error/failure + retry simulation | §12 (FAILED↔RUNNING transition) | §18 (error message sanitization) | Error/Retry State sections | FLOW-018 | ✅ Covered |
| No eval() / safe conditions | §10 | §7 (primary security requirement) | — | FLOW-008 | ✅ Covered |
| Demo Adapters clearly labeled | §15 | §15 (privacy/honesty) | Action output display implied in Inspector | FLOW-009 | ✅ Covered |
| No external API keys required | §18 Deployment | §13 Secrets | — | FLOW-001, FLOW-026 (future LLM) | ✅ Covered |
| Minimal workflow editing (add/delete/connect/edit config) | — (not detailed in architecture) | §5–6 validation covers edited config | Canvas ACTIONS list | FLOW-019 (P1) | ⚠️ See Finding 3 |
| Prototype pollution / XSS / injection prevention | — | §9–11 | — | FLOW-002, FLOW-011 (implicit) | ✅ Covered, see Finding 1 |

## 2. Contradictions

**None found that block implementation.** One near-contradiction was resolved during drafting and is noted here for transparency:

- The PRD (§14, Open Decisions) leaves in-memory vs. SQLite persistence as an open decision "recommendation: SQLite... in-memory acceptable to ship faster." The Architecture doc (§14) resolves this by specifying SQLite as default with in-memory as an explicit, interface-compatible fallback — not two competing designs. **No action needed**, but PRD's "Open Decisions" section should be understood as already resolved by the Architecture doc's decision; a future doc pass could tighten this by removing it from PRD §19 once implementation begins.

## 3. Findings

### Finding 1 — Minor gap: no explicit "workflow config validation" ticket
Security doc §5–6 and Architecture doc both assume workflow/node configuration validation exists as a distinct concern, and FEATURE_TICKETS.md does cover it as **FLOW-011 (Workflow & Node Configuration Validation)**. On review this is fully covered — flagged here only because it wasn't obvious from ticket title alone. **No action needed**, minor documentation clarity note only.

### Finding 2 — Missing requirement: Scenario endpoint not covered by a dedicated ticket
FRONTEND_SPEC.md's Scenario Selector (screen 4) references `GET /api/scenarios` as a possible data dependency, but TECHNICAL_ARCHITECTURE.md's API route list (§4) does not enumerate this endpoint, and no ticket explicitly creates it.
**Recommendation:** Either (a) add a `GET /api/scenarios` route to Architecture §4 and a small task under FLOW-005 or FLOW-012 to expose it, or (b) simplify by keeping scenario payloads static on the client (no endpoint needed) — the simpler option, and the one this audit recommends, since scenario data is small, fixed, and non-sensitive. **Action: adopt option (b)**; no new ticket required, but FLOW-005's implementation notes should clarify scenario payloads ship as a static client-side fixture, not a server endpoint.

### Finding 3 — Scope ambiguity: MVP editor depth
PRD §14 explicitly permits "add node, delete node, connect nodes, edit basic node configuration" as acceptable MVP editor scope, and FRONTEND_SPEC.md's Canvas ACTIONS list includes all of these as if they were P0. However, FEATURE_TICKETS.md places editing capability at **P1 (FLOW-019)**, not P0.
**Assessment:** This is a deliberate, correct prioritization, not an error — the PRD frames editing as merely "acceptable," while repeatedly emphasizing that "execution quality is more important than editor complexity" and the Anti-Overengineering Rule warns against over-investing in the editor. The Frontend Spec's inclusion of these actions describes the full intended feature set, not strictly the P0 slice.
**Recommendation:** Add a one-line scope note to FRONTEND_SPEC.md's Canvas section clarifying that add/delete/connect/edit-config are P1 per FEATURE_TICKETS.md, so a reader of the frontend spec alone doesn't assume all editing ships in the initial MVP. **Action: documentation clarification, no functional change.**

### Finding 4 — Unresolved decision carried correctly
PRD §19's retry-count/backoff question is resolved consistently everywhere it matters: Architecture §12 and §16 specify a single deterministic retry, Frontend Spec's Retry State section shows "retry 1/1," and FLOW-018 implements exactly this. **No inconsistency** — flagged only to confirm the open decision was, in practice, closed by the time it reached the architecture and ticket layers, and PRD §19 should be read as historical rationale rather than a currently-open question.

## 4. Scope Creep Risks

- **Risk:** The optional LLM extension (FLOW-026, P2) could tempt early implementation to "just wire up an API key" for a more impressive demo. **Mitigation:** PRD §17, Architecture §9/§18, and Security §13 all independently and consistently require deterministic implementations to be the working baseline with LLM strictly optional and clearly labeled — this is well-guarded across documents.
- **Risk:** The "minimal workflow editor" (FLOW-019) could expand into a full visual editor if not actively scoped down during implementation, directly contradicting the Anti-Overengineering Rule. **Mitigation:** Explicitly P1, and FEATURE_TICKETS.md's own ticket description caps it to exactly the four PRD-sanctioned actions.
- **Risk:** SQLite persistence could invite premature multi-user/multi-tenant thinking. **Mitigation:** PRD Non-Goals and Security §2–3 explicitly rule out authentication/authorization/multi-tenancy for MVP.

## 5. Unnecessary Complexity Check

No document introduces infrastructure beyond what the Anti-Overengineering Rule permits. Specifically verified absent throughout: queues, workers, Kubernetes, Kafka, Redis, Temporal, distributed execution, OAuth marketplace, billing, multi-tenancy, enterprise RBAC. The engine is confirmed single-process/in-node across Architecture §8 and §18.

## 6. Technical Risks

- **Polling vs. SSE for live execution state (FLOW-014):** Architecture doc allows either; polling is simpler to implement and sufficiently responsive at this scale, but could introduce minor animation jank if polling interval is too coarse. **Recommendation:** favor short-interval polling (e.g., 150–250ms) or SSE if implementation time allows; this is an implementation-time decision, not a spec gap.
- **Durable resume across server restart (FLOW-010):** requires the execution context to be fully reconstructable from persisted `NodeExecution` outputs rather than relying on any in-memory closure state. This is called out explicitly in FLOW-010's implementation notes and should be treated as a hard requirement, not an edge case, given SQLite is the default store.
- **Graph cycle detection (FLOW-011):** must run before the engine ever attempts to walk a workflow, since the engine itself has no independent step/iteration limit specified. **Recommendation:** as defense in depth, consider also adding a hard iteration cap inside the engine (e.g., max nodes visited per execution) even though validation should make this unreachable — cheap insurance against a future validation regression.

## 7. Security Risks

- **Highest-priority risk, well-mitigated:** dynamic code evaluation in the condition engine. Security §7 and Architecture §10 are fully aligned; FLOW-008 is explicitly flagged as the most security-sensitive ticket with mandated adversarial tests. No gap found.
- **Approval spoofing:** addressed by FLOW-016's explicit requirement that the server independently verify `WAITING_FOR_APPROVAL` state — this must be code-reviewed carefully at implementation time since it's the one place a demo could be embarrassingly "tricked" live in front of a client (e.g., replaying an approval call).
- **Residual risk, accepted and documented:** no authentication means anyone with the demo URL can trigger executions and approvals. This is explicitly accepted in Security §17 as appropriate for a synthetic-data, single-user demo, and this audit concurs — provided the application is never pointed at real data.

## 8. Final Recommendation

### WHAT MUST BE BUILT
- The full execution engine (FLOW-006 through FLOW-011) with the safe Condition Engine (FLOW-008) as the single most important and most carefully reviewed component.
- The complete, visible execution animation and Inspector (FLOW-013–015), since this is the signature experience the entire project is optimized around.
- The Human Approval suspend/resume with server-side authoritative verification (FLOW-010, FLOW-016).
- All four deterministic demo scenarios (FLOW-005, FLOW-018), including the retry/recovery path — without these, the demo cannot prove conditional logic or resilience.
- Workflow/config validation and the condition-engine security tests (FLOW-011, and the security tests in Security §18) — non-negotiable given the explicit "never eval()" requirement.

### WHAT SHOULD NOT BE BUILT
- A full drag-and-drop visual editor (FLOW-027) — explicitly deferred; the PRD is unambiguous that execution quality outranks editor sophistication.
- Any authentication/authorization system, multi-tenancy, or billing (FLOW-030 and related) — out of scope by design; would add cost without adding demo value.
- Real adapters (real email/CRM/webhooks, FLOW-028) — would break the project's honesty rule if not extremely carefully gated, and adds no value to the stated goal of proving the automation *concept*.
- Any distributed infrastructure (queues, workers, Kubernetes, Kafka, Redis, Temporal) — explicitly and repeatedly ruled out across every document; there is no requirement in this spec that would justify it.

### WHAT SHOULD RECEIVE THE MOST POLISH
1. **The RUN WORKFLOW execution animation** — this is named the signature experience in the PRD and Frontend Spec alike; it is the single element most likely to determine whether a viewer is convinced within the target two minutes.
2. **The Execution Inspector's transparency** — input/output/timing/config for every node, plus the plain-language condition explanation for branch decisions — is what differentiates Relay from "a static diagram with a fancy trigger animation."
3. **The Human Approval moment** — it is the project's stated "major product differentiator" and should feel genuinely consequential (clear stakes shown: score, estimated value, proposed action) rather than a generic confirm dialog.
4. **Honesty labeling on all Demo Adapters** — small in engineering effort, but directly protects the credibility of the whole demo; should be visually consistent and impossible to miss.
