# Agent Integrations: Hermes, Paperclip AI, OpenClaw, Claude Code, Codex

## Hermes

Hermes should power the in-app Channel Cast AI Agent. It should manage conversations, tool calls, role-aware permissions, action logs, and human handoff requests.

## Paperclip AI

Paperclip AI should act as the project source-of-truth layer. It should read `/docs` and help coding agents, admins, and the in-app AI Agent stay aligned with the product direction.

## OpenClaw / Open Claw

Use OpenClaw as an optional local/self-hosted operations bridge for chat-based developer and business workflows.

Good uses:

- Summarize repo/docs changes.
- Create tasks from docs.
- Monitor local scripts.
- Prepare prompts for Claude Code and Codex.
- Maintain project status notes.

Avoid:

- Customer-facing actions without review.
- Destructive local commands without confirmation.
- Accessing secrets or private customer data.

## Claude Code

Use Claude Code for broad implementation tasks, UI structure, refactors, and multi-file feature work.

## Codex

Use Codex for focused implementation tasks, tests, bug fixes, migrations, API routes, and small scoped changes.

## Tool Routing

- Product questions → Paperclip docs
- In-app user assistance → Hermes Agent
- Large code changes → Claude Code
- Focused code/test/migration tasks → Codex
- Local chat-driven project ops → OpenClaw
