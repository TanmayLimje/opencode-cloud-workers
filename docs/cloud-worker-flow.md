# Cloud Worker Lifecycle Flow

This document describes the complete lifecycle of a cloud worker task, from detection to merge.

## Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DETECT     │────▶│   OFFLOAD    │────▶│    TRACK     │────▶│    REVIEW    │
│              │     │              │     │              │     │              │
│ Agent sees   │     │ User accepts │     │ Jules works  │     │ PR ready     │
│ long task    │     │ → construct  │     │ → progress   │     │ → feedback   │
│ → suggest    │     │   prompt     │     │   updates    │     │   loop       │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────────┐
                                                               │    MERGE     │
                                                               │              │
                                                               │ Human        │
                                                               │ confirms     │
                                                               └──────────────┘
```

---

## Phase 1: Detection & Suggestion

The agent identifies tasks suitable for cloud offloading based on signals.

### Trigger Conditions

| Signal | Examples |
|--------|----------|
| **Task Complexity** | Multiple files, refactoring, migration |
| **Explicit Keywords** | "all files", "entire module", "comprehensive tests" |
| **Duration Estimate** | Would take >10 mins in session |
| **Independence Check** | Doesn't need conversation context |

### Agent Behavior

```
Agent detects long-running task...

┌─────────────────────────────────────────────────────────────────┐
│ This looks like a good candidate for cloud offloading:         │
│                                                                 │
│  • Estimated: 45+ minutes of work                               │
│  • Scope: 12 files across 3 modules                             │
│  • Independent: No conversation context needed                  │
│                                                                 │
│ Should I offload this to Jules? [Y/n]                           │
└─────────────────────────────────────────────────────────────────┘

User: "Yes"
```

---

## Phase 2: Prompt Construction & Offload

When user accepts, the agent constructs a structured prompt for Jules.

### Prompt Construction

```
USER REQUEST:
  "Add tests to all service files"
  
CONSTRUCTED JULES PROMPT:
┌─────────────────────────────────────────────────────────────────┐
│ TASK: Add comprehensive unit tests to all service files        │
│                                                                 │
│ SCOPE: src/services/**/*.ts (12 files)                          │
│                                                                 │
│ REQUIREMENTS:                                                   │
│   - Use vitest framework                                        │
│   - Mock external dependencies                                  │
│   - Achieve >80% coverage                                       │
│   - Follow existing patterns in src/services/__tests__          │
│                                                                 │
│ DELIVERABLE: Single PR with all tests                           │
│                                                                 │
│ TRACKING: Use OpenSpec to document your changes                 │
│   - Create openspec/changes/add-service-tests.md                │
│   - Update progress as you work                                 │
│   - This helps us review your work efficiently                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task Tracking (Tier 1)

The task is saved to `.opencode/cloud-workers/state.json`:

```json
{
  "id": "uuid-local-id",
  "provider": "jules",
  "remoteSessionId": "jules_session_xyz",
  "status": "queued",
  "prompt": "Add tests to all service files",
  "expectedOutcomes": [
    "Tests implemented and passing",
    "Coverage above 80%",
    "No breaking changes introduced"
  ],
  "reviewRound": 0,
  "reviewHistory": []
}
```

**Note:** `expectedOutcomes` are auto-extracted from the prompt using AI.

### User Notification

```
┌─────────────────────────────────────────────────────────────────┐
│ ☁️ Task offloaded to Jules (ID: cw_abc123)                       │
│                                                                 │
│ Jules will:                                                     │
│   • Clone your repo                                             │
│   • Create tests for 12 service files                           │
│   • Open a PR when complete                                     │
│                                                                 │
│ I'll notify you when it's ready for review.                     │
│ Would you like to continue with other work?                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Execution (Remote)

Jules works in its cloud sandbox.

### State Progression

```
QUEUED → PLANNING → IN_PROGRESS → COMPLETED
           │              │
           ▼              ▼
    AWAITING_PLAN    AWAITING_USER
    _APPROVAL        _FEEDBACK
```

### What Jules Does

1. Clones repository
2. Sets up environment (installs dependencies)
3. Creates OpenSpec change proposal (Tier 2)
4. Works through files, updating progress
5. Runs tests
6. Creates PR with structured commits

---

## Phase 4: Polling & Notification

The plugin polls Jules every 60 seconds (configurable).

### Polling Logic

```typescript
// Every poll_interval_ms (default: 60000)
for (const task of activeTasks) {
    const status = await provider.getStatus(task.providerSessionId);
    
    if (status.state === "COMPLETED") {
        task.status = "pr_ready";
        task.prUrl = status.prUrl;
        notifyUser(task);
    }
}
```

### Notification Scenarios

```
┌─────────────────────────────────────────────────────────────────┐
│ SAME SESSION OPEN:                                              │
│   → Inject notification into conversation                       │
│   → Auto-trigger review if configured                           │
├─────────────────────────────────────────────────────────────────┤
│ SESSION CLOSED:                                                 │
│   → Queue notification for next session                         │
│   → Set task.notificationQueued = true                          │
├─────────────────────────────────────────────────────────────────┤
│ NEW SESSION (user runs /cw status):                             │
│   → Load tasks.json                                             │
│   → Show pending tasks                                          │
│   → User can trigger review with /cw review [id]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Review

Local AI reviews the PR against expected outcomes.

### Review Process

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FETCH                                                        │
│    • Fetch PR diff from GitHub                                  │
│    • Read OpenSpec from PR branch (Tier 2)                      │
├─────────────────────────────────────────────────────────────────┤
│ 2. COMPARE                                                      │
│    • Check against expectedOutcomes (Tier 1)                    │
│    • Verify all requirements met                                │
├─────────────────────────────────────────────────────────────────┤
│ 3. ANALYZE                                                      │
│    • Send to Oracle agent for deep analysis                     │
│    • Check for bugs, security issues, style violations          │
├─────────────────────────────────────────────────────────────────┤
│ 4. RESULT                                                       │
│    {                                                            │
│      approved: boolean,                                         │
│      blockingIssues: [...],                                     │
│      suggestions: [...],                                        │
│      feedback: "..."                                            │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Review History

Each review is recorded in `reviewHistory`:

```json
{
  "reviewHistory": [
    {
      "round": 1,
      "timestamp": "2025-12-23T12:00:00Z",
      "approved": false,
      "issues": 3,
      "feedback": "Missing tests for error cases in AuthService...",
      "summary": "Round 1: 3 issues"
    }
  ]
}
```

**Note:** Older entries are summarized to keep payload small. Latest entry has full feedback.

---

## Phase 6: Feedback Loop

If issues are found, feedback is sent back to Jules.

### Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│ ISSUES FOUND && reviewRound < maxReviewRounds:                  │
│   → Construct fix prompt from feedback                          │
│   → Send to SAME Jules session (providerSessionId)              │
│   → Increment reviewRound                                       │
│   → Back to Phase 3 (Jules works on fixes)                      │
├─────────────────────────────────────────────────────────────────┤
│ ISSUES FOUND && reviewRound >= maxReviewRounds:                 │
│   → "Max rounds reached, manual review needed"                  │
│   → Human must review and decide                                │
├─────────────────────────────────────────────────────────────────┤
│ NO BLOCKING ISSUES:                                             │
│   → Proceed to merge (human confirmation required)              │
└─────────────────────────────────────────────────────────────────┘
```

### Feedback Prompt Construction

```
┌─────────────────────────────────────────────────────────────────┐
│ FEEDBACK: Round 1 Review Results                                │
│                                                                 │
│ The following issues were found in your PR:                     │
│                                                                 │
│ 1. [BLOCKING] AuthService tests missing error cases             │
│    - Need tests for: invalid token, expired session             │
│                                                                 │
│ 2. [BLOCKING] UserService test coverage is 65%, need 80%        │
│    - Missing: updateProfile, deleteAccount methods              │
│                                                                 │
│ 3. [SUGGESTION] Consider using test fixtures for mock data      │
│                                                                 │
│ Please address the blocking issues and update the PR.           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 7: Merge (Human Confirmed)

After review passes, human confirms the merge.

### Why Human Confirmation?

- Agents miss edge cases, security issues, breaking changes
- "No cons found" ≠ "Safe to merge"
- Merge is irreversible — review is cheap, rollback is expensive
- Trust builds over time

### Merge Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent: "Review passed. Merge this PR?"                          │
│                                                                 │
│ PR: Add comprehensive tests for all service files               │
│ URL: https://github.com/owner/repo/pull/42                      │
│                                                                 │
│ Summary:                                                        │
│   • 12 test files added                                         │
│   • Coverage: 85% (target was 80%)                              │
│   • All CI checks passed                                        │
│   • No blocking issues found                                    │
│                                                                 │
│ [Merge] [View PR] [Decline]                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Conflict Handling

```
┌─────────────────────────────────────────────────────────────────┐
│ NO CONFLICTS:                                                   │
│   → Execute merge via GitHub API                                │
│   → Update task status to "merged"                              │
│   → Archive task context                                        │
├─────────────────────────────────────────────────────────────────┤
│ CONFLICTS DETECTED:                                             │
│   → Agent suggests resolution approach                          │
│   → Human confirms resolution                                   │
│   → Resolve and merge                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commands Reference

| Command | Alias | Description |
|---------|-------|-------------|
| `/cloud-workers status` | `/cw status` | List all tasks with current status |
| `/cloud-workers review [id]` | `/cw review` | Start reviewing a specific task |
| `/cloud-workers cancel [id]` | `/cw cancel` | Cancel an in-progress task |
| `/cloud-workers history` | `/cw history` | Show completed/merged tasks |
| `/cloud-workers retry [id]` | `/cw retry` | Retry a failed task |

---

## Task Status States

| Status | Description |
|--------|-------------|
| `pending` | Task created, not yet sent to provider |
| `queued` | Sent to provider, waiting to start |
| `planning` | Provider is planning the work |
| `in_progress` | Provider is working |
| `pr_ready` | PR created, ready for review |
| `reviewing` | Local review in progress |
| `awaiting_merge` | Review passed, waiting for human confirmation |
| `merged` | Successfully merged |
| `failed` | Task failed |
| `cancelled` | Task cancelled by user |

---

## Related Documents

- [Architecture Overview](./architecture.md) - System design and components
- [Configuration Guide](./configuration.md) - All configuration options
- [Getting Started](./getting-started.md) - Quick start guide
