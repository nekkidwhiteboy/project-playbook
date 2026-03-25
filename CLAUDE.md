# Project Playbook — Master Instructions

## What This Repository Is

This is a **master playbook system** for building software projects using Claude Code. Every new project gets a subfolder here. This root-level CLAUDE.md teaches Claude Code how to operate across all projects in this system.

When working on a specific project, always read both this file AND the project-level CLAUDE.md inside the project subfolder before doing anything else.

---

## The Playbook Process

Every new project moves through these phases in order. Each phase has a corresponding guide in `/playbooks/`. Do not skip phases or begin a phase before the prior one is documented as complete in the project's STATUS.md.

| Phase | Playbook | Output |
|-------|----------|--------|
| 1 | 01-discovery.md | Purpose, features, audience, monetization, constraints |
| 2 | 02-design-vision.md | Aesthetic direction, component inventory, design system |
| 3 | 03-research.md | Competitive research reports |
| 4 | 04-tech-stack.md | Stack decision, deployment plan, testing strategy |
| 5 | 05-data-architecture.md | Entity map, DATA_MODEL.md |
| 6 | 06-integrations.md | Third-party service map |
| 7 | 07-scaffolding.md | Folder structure, CONVENTIONS.md |
| 8 | 08-claude-setup.md | Project CLAUDE.md, GitHub sync |
| 9 | 09-seo-content.md | URL structure, metadata strategy |
| 10 | 10-implementation-guide.md | Human-readable "why" document |
| 11 | 11-feature-roadmap.md | Dependency-mapped feature list |
| 12 | 12-subagent-strategy.md | Parallelization decisions |
| 13 | 13-feature-guides.md | One detailed guide per feature |
| 14 | 14-todo-system.md | Rolling session TODO list |
| 15 | 15-legal-compliance.md | Privacy, payments, data retention checklist |

---

## Universal Work Habits

These rules apply to every project in this system without exception.

### The Build Loop
For every task, without exception, follow this exact sequence:
1. Read the relevant feature guide in `/docs/`
2. Build **one logical unit** — not an entire feature, one unit
3. Test it works
4. Fix any errors
5. Test again
6. Confirm it is working
7. Commit with a descriptive message
8. Update CHANGELOG.md
9. Only then move to the next unit

**Never move forward with a broken or untested unit. Never.**

### Before Every Session
1. Read this file
2. Read the project CLAUDE.md
3. Read STATUS.md — this tells you exactly where things stand
4. Read the current TODO.md
5. Begin work on the first incomplete item

### After Every Session
Update STATUS.md with:
- What was completed this session
- What is in progress
- What is blocked and why
- What the next session should tackle first

### Commits
- Commit after every working unit — not at the end of a session
- Format: `[feature-name] brief description of what was done`
- Example: `[auth] add email verification flow`
- Never commit broken code

### Environment Variables
- Never hardcode secrets, API keys, or credentials
- Always use environment variables
- Always maintain a `.env.example` file with placeholder values
- Never commit `.env` files

### Error Handling
- Never silently swallow errors
- Always log errors with context — what was happening, what failed
- User-facing errors must be human-readable, not raw error objects

### Definition of Done
A task is done when:
- [ ] It works as specified
- [ ] Errors are handled gracefully
- [ ] It has been tested
- [ ] Code is committed
- [ ] CHANGELOG.md is updated
- [ ] STATUS.md reflects current state

---

## Creating a New Project

When starting a new project in this system:

1. Create a subfolder: `mkdir project-name`
2. Copy the template structure from `/templates/`
3. Run through Phase 1 (Discovery) before creating any code files
4. The stakeholder interview app in `/templates/stakeholder/` should be the first tool used for any project with multiple decision-makers

---

## Repository Structure

```
project-playbook/
├── .claude/
├── playbooks/          # Phase guides — read before each phase
├── templates/          # Reusable starting files for new projects
├── CLAUDE.md           # This file — read at start of every session
└── [project-name]/     # One subfolder per project
    ├── CLAUDE.md       # Project-specific instructions
    ├── CHANGELOG.md    # Running log of all changes
    ├── STATUS.md       # Current state — updated every session
    ├── TODO.md         # Active task list for Claude Code
    ├── docs/           # All planning and design documents
    ├── src/            # Application source code
    └── ...
```

---

## GitHub Sync

- Remote: set per project (see project CLAUDE.md)
- Branch strategy: `main` for stable, `dev` for active work
- Always push at the end of a working session
- Never force push to main

---

## Context Management

If approaching context limits during a session:
1. Finish the current logical unit cleanly
2. Commit all work
3. Update STATUS.md and TODO.md thoroughly
4. Note the exact next step needed
5. End the session — the next session will pick up from STATUS.md

Do not try to squeeze more work in when context is running low. A clean handoff is more valuable than a rushed one.
