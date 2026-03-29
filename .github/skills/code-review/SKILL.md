---
name: code-review
description: 'Review code changes, pull requests, and work done on issues. Use when you need to assess code quality, verify requirements are met, find bugs, or provide structured review feedback.'
argument-hint: 'Describe what to review, e.g. "review PR #42" or "review the work done for issue #15"'
---

# Code Review Skill

## Purpose
Use this skill to review code changes systematically. It covers correctness, quality, security, testing, and completeness relative to issue requirements.

## When To Use
- Reviewing a pull request for code quality and correctness.
- Verifying that work done on an issue meets acceptance criteria.
- Checking for security vulnerabilities or performance issues.
- Assessing test coverage for new or changed code.

## Workflow

### Step 1: Gather Context
- Read the issue or PR description for requirements and acceptance criteria.
- Identify the files changed and the scope of modifications.

```bash
# List PRs mentioning the issue
gh pr list --search "issue_number" --json number,title,state

# Get PR diff
gh pr diff PR_NUMBER

# Get changed files
gh pr view PR_NUMBER --json files --jq '.files[].path'
```

### Step 2: Review Code Changes
For each changed file, check:
- **Correctness**: Does the logic match the intended behavior?
- **Edge cases**: Are boundary conditions handled?
- **Error handling**: Are errors caught and reported properly?
- **Security**: No injection risks, secrets exposure, or auth bypasses?
- **Performance**: No N+1 queries, unnecessary loops, or memory leaks?
- **Readability**: Clear naming, appropriate comments, consistent style?

### Step 3: Verify Tests
- Check that new or changed functionality has corresponding tests.
- Verify tests cover both happy path and error scenarios.
- Run existing tests to confirm nothing is broken.

```bash
# Run tests (adjust command for the project's test framework)
npm test        # Node.js
pytest          # Python
dotnet test     # .NET
go test ./...   # Go
```

### Step 4: Provide Feedback
Structure your review as:
1. **Summary**: One-paragraph overview of what the changes do.
2. **Strengths**: What was done well.
3. **Issues**: Specific problems found (with file/line references).
4. **Suggestions**: Optional improvements that aren't blockers.
5. **Verdict**: Approve, request changes, or comment.

```bash
# Post a review on a PR
gh pr review PR_NUMBER --approve --body "Review summary..."
gh pr review PR_NUMBER --request-changes --body "Issues found..."
gh pr review PR_NUMBER --comment --body "Review notes..."

# Comment on an issue
gh issue comment ISSUE_NUMBER --body "Review summary..."
```

## Quality Checks
- Every issue raised references a specific file and line or code snippet.
- Feedback is actionable — not just "this is bad" but "change X to Y because Z".
- Security and correctness issues are flagged as blockers.
- Style nits are clearly marked as optional / non-blocking.