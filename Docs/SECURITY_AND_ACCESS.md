# Relay — Security and Access

**Status:** FUNCTIONAL DEMO / PROTOTYPE

---

## 1. Trust Boundaries

| Boundary | Trusted side | Untrusted side |
|---|---|---|
| Browser ↔ API | Server-side engine, persistence | Client-submitted workflow edits, execution triggers, approval decisions |
| API ↔ Handlers | Engine orchestration | Node `configuration` objects (authored via UI, potentially manipulated) |
| API ↔ Persistence | Server process | None — SQLite/in-memory store is not directly reachable by the client |

Everything that crosses from the browser into the server — workflow configuration, node configuration, simulated webhook payloads, query parameters, and execution inputs — is treated as untrusted and validated before use, even though the data is synthetic for demo purposes. This is a deliberate choice: the point of the project is to demonstrate credible engineering practice, not just a working demo.

## 2. Authentication Decision

**MVP: no authentication.** This is a single-user, no-login portfolio demo with no real user data, no billing, and no multi-tenant concerns. Adding auth would add complexity without adding credibility for the stated audience. This limitation is explicitly documented (see §17) so it is never mistaken for an oversight.

## 3. Authorization Decision

**MVP: no authorization model.** All actions (run workflow, approve/reject, edit node config) are available to any visitor of the demo instance. If Relay were extended toward production, an authorization layer would be required before real approval decisions or real adapters were introduced — approval, in particular, must never be an unauthenticated action once it triggers real-world effects.

## 4. Input Validation

All API route handlers validate request bodies against explicit schemas (e.g., Zod) before touching the engine or persistence:

- Execution start payloads are validated against the expected trigger input shape for the workflow's trigger node.
- Approval decisions are validated to be a strict boolean plus an optional short string note, with a length cap.
- Query parameters (execution id, workflow id) are validated as expected ID formats, not passed directly into any storage query without parameterization.

Invalid input returns a 4xx response with a validation error; it is never silently coerced or passed through.

## 5. Workflow Validation

Before a workflow definition is accepted (whether seeded or edited via the limited MVP editor), it is validated for structural integrity:

- Every edge's `source`/`target` must reference an existing node id.
- Exactly one trigger node exists as the entry point (no orphaned/multiple ambiguous entry points for MVP).
- No cycles that would cause infinite execution (a workflow graph is validated as a DAG at save time).
- Every `logic.condition`/`logic.switch`/`human.approval` node has the expected edge labels (`condition` value(s), or `"approved"`/`"rejected"`) present and non-conflicting.

A workflow that fails validation is rejected at save time with a specific error, not accepted and left to fail unpredictably at run time.

## 6. Node Configuration Validation

Each node `type` has a dedicated configuration schema validated at both workflow-save time and execution time (defense in depth):

- `logic.condition` / `logic.switch`: configuration must be a well-formed `ConditionExpression` (see §7) — `field` restricted to a known allow-list of context field names, `operator` restricted to the enumerated operator set, `value` restricted to primitive/array-of-primitive types.
- `action.*`: configuration (e.g., email template string) is validated for type and length; template placeholders are restricted to a known allow-list of context fields (see §9).
- `transform.*`: configuration validated per handler's expected shape (e.g., scoring weights must be numbers within a sane range).

Unknown node `type` values are rejected outright rather than silently ignored.

## 7. Expression Safety

This is the most important security property of the system.

Conditions are **never** expressed as, or evaluated as, arbitrary code. The only representation accepted is the structured `ConditionExpression` object:

```json
{ "field": "leadScore", "operator": "greater_than", "value": 80 }
```

The evaluator:

- Resolves `field` via a strict, allow-listed dot-path resolver against a plain data object — it does **not** use dynamic property access derived directly from unsanitized user strings without validation, and it explicitly rejects path segments like `__proto__`, `constructor`, or `prototype`.
- Applies exactly one of a fixed, enumerated set of operators via a `switch` statement. There is no operator that accepts or executes a string as code.
- Returns a boolean and a human-readable explanation string for the trace.

**Never implement:** `eval(expression)`, `new Function(expression)`, template-literal interpolation of user strings into executed code, or a "power user expression mode" that accepts free-form JS. If a future extension genuinely requires richer expressions, the correct path is a small, purpose-built parser for a constrained grammar (e.g., a safe boolean-logic DSL) — not a general-purpose code evaluator.

## 8. Arbitrary Code Execution Prevention

- No node handler ever executes a string as code (no `eval`, `Function`, `vm.runInNewContext` with untrusted input, `child_process` calls driven by user data, or dynamic `require`/`import` of user-supplied paths).
- Text generation (`transform.generate_text`) uses fixed template strings with placeholder substitution only — substitution values are inserted as data, never as executable template fragments.
- If an LLM provider is added as a future extension, its output is treated as untrusted display text (rendered as text, never as HTML/markup without sanitization, and never fed back into the condition engine as a `field` name or `operator`).

## 9. Prototype Pollution Prevention

- Execution context is built via explicit key assignment (`{ ...prev, [nodeId]: output }`) using `Object.create(null)` or a `Map` internally where merging user-influenced keys is involved, never via unguarded deep-merge of untrusted objects.
- Any JSON.parse of client input is followed by schema validation (see §4–6) before the object is merged into any long-lived structure; `__proto__`, `constructor`, and `prototype` keys are explicitly stripped/rejected during validation.
- Dependencies used for merging/cloning (if any) are chosen for known prototype-pollution safety and kept up to date (see §14).

## 10. XSS

- All user-influenced strings (node names, config labels, generated text, approval notes) are rendered through React's default text interpolation (`{value}`), never via `dangerouslySetInnerHTML`.
- If any markdown/rich-text rendering is introduced for generated response drafts, it goes through a sanitizing renderer with a restrictive allow-list of tags — never raw HTML injection.
- Node `configuration` values are never interpreted as HTML/CSS/JS by the canvas renderer; they are always treated as inert data mapped to fixed visual templates.

## 11. Injection

- Persistence uses parameterized queries / an ORM's parameter binding exclusively — no string-concatenated SQL, even though all demo data is synthetic.
- Execution context field lookups are allow-listed (§7), which also forecloses "field name injection" into internal data structures.

## 12. Webhook Payload Safety

The "Simulated Webhook" trigger accepts a JSON payload shaped like the demo inquiry schema. Even though it is simulated (no real internet-facing webhook endpoint is exposed for production use), the same input validation rules apply as any other untrusted input: schema-validated shape, bounded string lengths, rejected unknown/extra fields beyond a defined allow-list, and no pass-through into the condition engine's `field` resolution without validation.

## 13. Secrets

- MVP requires **zero** secrets to run — no API keys, no credentials, nothing in `.env` is required for the demo to function.
- If an optional LLM provider extension is added, its API key is read only from server-side environment variables, is never sent to or readable by the client, and the app must detect its absence and fall back to deterministic handlers rather than failing.
- No secret values are ever logged (see §14) or included in execution trace output, even hypothetically.

## 14. Logging

- Execution logs (node status transitions, condition evaluation explanations) are structured and contain only demo/synthetic data — never secrets, and never real PII, since none is collected.
- Error logs capture the error message and node id but avoid dumping full request bodies indiscriminately in production-style logs, to model good practice even though the data here is synthetic.

## 15. Privacy

All customer/lead data in the demo is synthetic (e.g., "Sarah Chen," "Acme Systems"). No real personal data is collected, stored, or transmitted anywhere in the application. This is stated explicitly in the UI and in the PRD so the demo is never mistaken for handling real customer data.

## 16. Dependency Security

- Dependency set is kept intentionally small (Next.js, React, Tailwind, a schema validator, a lightweight DB layer) to minimize attack surface and audit burden.
- `npm audit` (or equivalent) is run as part of CI; no dependency with a known critical/high vulnerability is shipped without a documented mitigation.
- No dependency is granted network access beyond what the app itself needs; demo adapters make no outbound network calls at all.

## 17. Demo Limitations (explicitly documented, not hidden)

- No authentication or authorization — unsuitable for handling real data or real approvals as-is.
- No rate limiting — acceptable for a demo instance, would need to be added before any public production exposure.
- Human Approval is authoritative only within this single-user, unauthenticated demo context; a production version would require verifying the approver's identity and permissions before honoring an approval decision.
- SQLite (or in-memory) persistence has no encryption-at-rest or backup strategy — acceptable because no sensitive data exists.

## 18. Security Tests

- Condition engine: reject `__proto__`/`constructor`/`prototype` field paths; reject unknown operators; reject non-primitive `value` types; confirm no code path ever calls `eval`/`Function`.
- Workflow validation: reject cyclic graphs, dangling edges, missing trigger, malformed node configuration per type.
- API: reject malformed execution-start and approval payloads with 4xx and no partial state mutation; confirm approval endpoint no-ops (with an error) if the execution is not actually `WAITING_FOR_APPROVAL`.
- XSS: render a node name / generated-text field containing `<script>` and assert it is displayed as inert text, not executed.
- Static analysis: lint rule or CI check forbidding `eval(`, `new Function(`, and `dangerouslySetInnerHTML` anywhere in the codebase outside an explicitly reviewed exception list (ideally: none).
