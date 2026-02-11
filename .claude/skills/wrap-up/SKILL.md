---
name: wrap-up
description: End-of-session wrap-up that updates GitHub issues with progress and next steps, updates plan files, offers to commit uncommitted changes, offers to create PRs, and reflects on the session to update CLAUDE.md with useful learnings. Use when the user says "wrap up", "let's wrap up", "end session", or invokes /wrap-up.
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

### Step 6: Session Reflection & CLAUDE.md Update

Reflect on the session and consider whether anything learned should be captured in `CLAUDE.md` for future sessions:

1. Review what was built, patterns used, and any pain points encountered
2. Consider updates to `CLAUDE.md` such as:
   - New patterns or conventions established (e.g., a new component pattern, API route structure)
   - Gotchas or lint rules that caused issues and how to handle them
   - New project structure entries (new directories, file conventions)
   - Architecture notes for new features or integrations
   - Anything a future session would benefit from knowing upfront
3. If there are updates worth making, show the proposed changes and ask the user using AskUserQuestion:
   - Option 1: "Yes, update CLAUDE.md"
   - Option 2: "No, skip"
4. If yes, apply the edits to `CLAUDE.md`
5. If no meaningful learnings to capture, skip this step silently

**Guidelines:**
- Keep `CLAUDE.md` concise — it's loaded every session, so avoid bloat
- Only add information that would save time or prevent mistakes in future sessions
- Update existing sections rather than always appending new ones
- Don't add temporary or session-specific details (those belong in issue comments)

### Step 7: Recommend New Skills or Tools

Review the session for scripts, commands, multi-step processes, or workflows that were run and could be useful in future sessions. Look for:

1. **Repeated commands or patterns** — Bash commands or sequences that were run multiple times (e.g., credential refresh, build-and-deploy steps, data migration scripts)
2. **Multi-step workflows** — Processes that required several coordinated steps to complete (e.g., "create DynamoDB table → set TTL → add env var → redeploy")
3. **Project-specific conventions** — Patterns that encode domain knowledge a future session wouldn't know (e.g., how to test alerting, how to deploy to Amplify, how to set up a new pipeline)
4. **External tool integrations** — AWS CLI commands, GitHub CLI workflows, or API calls that required specific flags or configurations

For each candidate, consider:
- Would a future session likely need to do this again?
- Is it complex enough that encoding it as a skill saves meaningful time?
- Does it require project-specific knowledge that isn't obvious?

If there are recommendations:

1. Present a summary of each recommended skill with:
   - **Name**: Suggested skill name (lowercase, hyphens)
   - **Purpose**: What it automates or simplifies
   - **Trigger**: When a future session would use it
   - **Example**: The key commands or steps it would encode
2. Ask the user using AskUserQuestion:
   - Option 1: "Yes, create recommended skills"
   - Option 2: "Pick which ones to create" (if multiple)
   - Option 3: "No, skip"
3. If yes, use the `/skill-writer` skill to create each approved skill

If no meaningful skill candidates are found, skip this step silently.

### Step 8: Final Summary

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

### CLAUDE.md Updated
Added ECS memory configuration note to Architecture Notes.

### Recommended Skills
Created `amplify-deploy` skill — automates the Amplify env var update + redeploy workflow.

### Next Session
- Monitor HubSpot sync for remaining 12 streams
- Verify memory fix resolves OOM errors
```

## Notes

- Always ask before committing or creating PRs - never do these automatically
- If no GitHub issue is found, skip that step and mention it in the summary
- If no plan file exists, skip that step
- Be concise in issue updates - focus on facts, not narrative
