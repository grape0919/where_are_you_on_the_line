---
name: git-pr-merge
description: Commit validated workspace changes, push a branch, create a GitHub pull request, and merge it safely end-to-end. Use when the user wants the current work shipped through git/gh, including commit message creation, branch push, PR opening, PR checks, merge, and post-merge cleanup while respecting repo-specific rules.
---

# Git PR Merge

Ship already-implemented work through git and GitHub with a consistent, reviewable workflow.

Prefer this skill when the user explicitly wants all of these handled in one flow:
- commit
- push
- PR creation
- merge

Before acting, read repository-local instructions such as `AGENTS.md`, `README`, contribution docs, or other git workflow notes if they exist.

## Preconditions

Confirm these before changing git state:

- The user has approved committing and pushing.
- The current workspace changes are intentional.
- `git` and `gh` are available.
- `gh auth status` is valid for the target remote when PR creation or merge is required.
- Required validation for the repo has already passed, or can be run now.

If any precondition is missing, stop and resolve it before creating commits or PRs.

## Workflow

### 1. Inspect repository state

Run and review:

```bash
git status --short
git branch --show-current
git remote -v
```

Read repo instructions that affect git flow, such as:
- branch naming rules
- commit message conventions
- PR title/body conventions
- required checks
- auto-generated PR labeling rules

If running inside Codex and a new branch must be created, follow any enforced branch prefix from the environment or repo instructions before pushing.

Never sweep unrelated user changes into the same commit without calling that out explicitly.

### 2. Validate before commit

Run the smallest meaningful validation for the changed files first, then broader checks if needed.

Typical order:

```bash
pnpm test
pnpm lint
pnpm build
```

If validation fails, fix the issue or report the blocker before committing.

### 3. Stage only the intended changes

Prefer explicit paths over broad staging when possible:

```bash
git add path/to/file
git add another/file
```

Use `git diff --cached --stat` and `git diff --cached` to verify the staged contents match the requested work.

### 4. Create the commit

Write a concrete commit message that matches repo conventions.

Prefer:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Avoid vague messages such as `update`, `changes`, or `fix stuff`.

Use a non-interactive command:

```bash
git commit -m "feat: concise description"
```

Do not amend unless the user explicitly asked for it.

### 5. Push the branch

If already on the correct feature branch, push it. If a new branch is needed, follow repo naming rules first.

Example:

```bash
git push -u origin <branch-name>
```

If the repo requires a specific prefix, honor it. If instructions conflict with the current branch, create a compliant branch before pushing.

Example branch creation flow:

```bash
git checkout -b <compliant-branch-name>
git push -u origin <compliant-branch-name>
```

### 6. Open the pull request

Use `gh pr create` non-interactively. Build the title/body from the actual diff, not from guesses.

Minimum PR body should include:
- problem or purpose
- summary of changes
- validation performed
- any remaining risk or follow-up

If the repo requires auto-generated PR conventions, apply them here. Example: title prefix or labels such as `auto-generated`.

Example:

```bash
gh pr create --title "feat: concise description" --body "..."
```

After creation, capture and report:
- PR URL
- target branch
- title

### 7. Check PR status before merge

Review:

```bash
gh pr status
gh pr checks
```

If checks are pending, wait or poll.
If checks fail, inspect, fix, recommit, and push before merging.

Do not merge a failing PR unless the user explicitly instructs it and repo policy allows it.

### 8. Merge safely

Prefer the repo's standard merge strategy. If unclear:
- use squash merge for single-feature work
- use merge commit only when preserving commit structure matters
- use rebase merge only when the repo clearly prefers it

Use a non-interactive command such as:

```bash
gh pr merge --squash --delete-branch
```

If local branch cleanup is still needed after merge, use:

```bash
git fetch --prune
git branch -d <branch-name>
```

## Safeguards

- Never use destructive reset or checkout commands unless explicitly requested.
- Never include unrelated dirty files just to make the branch clean.
- Never merge without checking PR state first.
- Never assume GitHub auth is available; verify it.
- Prefer explicit dates, branch names, and command results in the final report.
- If repo instructions and default git habits conflict, follow the repo instructions.

## Final response checklist

Report these items back to the user:

- commit hash and commit message
- branch name pushed
- PR URL
- merge method used
- final merge result
- any checks that were run
- any checks not run or remaining risks

