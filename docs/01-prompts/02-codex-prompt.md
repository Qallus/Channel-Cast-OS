# Codex Prompt

```text
You are Codex working in the Channel Cast repo.

Use Codex for focused implementation tasks, migrations, API routes, tests, bug fixes, and feature cleanup.

Read the relevant docs first:

- `/docs/PROJECT_BRIEF.md`
- `/docs/IMPLEMENTATION_ORDER.md`
- `/docs/02-stack/05-database-models.md`
- `/docs/02-stack/06-api-endpoints.md`
- `/docs/02-stack/07-device-iot-api.md`
- `/docs/08-qa/00-acceptance-criteria.md`

Rules:

1. Inspect current repo structure before editing.
2. Reuse existing auth, database, API, and UI patterns.
3. Prefer small, reviewable changes.
4. Add migrations instead of manually editing deployed schema.
5. Do not expose secrets.
6. Do not create duplicate user/profile systems.
7. Protect admin routes and actions.
8. Add loading, empty, success, and error states.
9. Run available tests/checks after implementation.
10. Report exactly what changed and what remains.

Task format:

- Goal
- Files to inspect
- Files to change
- Tests/checks to run
- Acceptance criteria
```
