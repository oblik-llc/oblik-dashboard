---
name: wrap-up
description: End-of-session wrap-up that updates GitHub issues with progress and next steps, updates plan files, offers to commit uncommitted changes, and offers to create PRs. Use when the user says "wrap up", "let's wrap up", "end session", or invokes /wrap-up.
---

# Session Wrap-Up

Cleanly close out a working session by documenting progress and preparing code for handoff.

## Instructions

When this skill is invoked, perform the following steps in order:

### Step 1: Gather Session Context

1. Check git status for uncommitted changes:
   ```bash
   git status
   ```

2. Check git log for recent commits in this session:
   ```bash
   git log --oneline -10
   ```

3. Identify the current branch:
   ```bash
   git branch --show-current
   ```

4. Check if there's an associated GitHub issue by looking at:
   - Recent commit messages for issue references (#123)
   - Branch name for issue references
   - Recent conversation context for issue numbers mentioned

### Step 2: Update GitHub Issues

If a GitHub issue was being worked on:

1. Summarize what was accomplished during the session
2. List any next steps or remaining work
3. Add a comment to the issue using:
   ```bash
   gh issue comment <issue-number> --body "<update>"
   ```

Format the update as:
```markdown
## Session Update - [Date]

### Accomplished
- [Bullet points of completed work]

### Next Steps
- [Remaining tasks, if any]
- [Blockers or questions, if any]
```

### Step 3: Update Plan Files

If a plan file was being used (check for files like `PLAN.md`, `plan.md`, or files in `.claude/`):

1. Read the current plan
2. Mark completed items as done
3. Add any new items discovered during the session
4. Update the plan file with changes

### Step 4: Handle Uncommitted Changes

If there are uncommitted changes:

1. Show the user what files have changed:
   ```bash
   git status
   git diff --stat
   ```

2. Ask the user if they want to commit these changes using AskUserQuestion:
   - Option 1: "Yes, commit changes"
   - Option 2: "No, leave uncommitted"

3. If yes, create a commit following the repository's commit conventions

### Step 5: Offer Pull Request

If the current branch is not main/master AND has commits not in main:

1. Check if a PR already exists:
   ```bash
   gh pr list --head <branch-name>
   ```

2. If no PR exists, ask the user if they want to create one using AskUserQuestion:
   - Option 1: "Yes, create PR"
   - Option 2: "No, skip PR"

3. If yes, create the PR with a summary of all changes on the branch

### Step 6: Final Summary

Provide a brief summary to the user:
- What was updated (issues, plans, commits, PRs)
- Any pending items for next session
- Links to any created/updated GitHub resources

## Example Output

```
## Session Wrap-Up Complete

### GitHub Issue #7 Updated
Added progress comment with 4 accomplished items and 2 next steps.
https://github.com/org/repo/issues/7#issuecomment-123456

### Code Changes
Committed 3 files: "Increase HubSpot connector memory to fix OOM errors"

### Pull Request
Created PR #14: https://github.com/org/repo/pull/14

### Next Session
- Monitor HubSpot sync for remaining 12 streams
- Verify memory fix resolves OOM errors
```

## Notes

- Always ask before committing or creating PRs - never do these automatically
- If no GitHub issue is found, skip that step and mention it in the summary
- If no plan file exists, skip that step
- Be concise in issue updates - focus on facts, not narrative
