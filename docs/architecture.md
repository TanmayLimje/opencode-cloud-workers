# Architecture Overview

The OpenCode Cloud Workers plugin is built on the philosophy of **"Local Strategy, Remote Execution."**

## Philosophy: Local Strategy, Remote Execution

This design pattern ensures that while heavy computation and execution happen in isolated cloud environments, the intelligence, context, and final decision-making remain local to your development environment.

- **Local (OpenCode)**: Holds the project context, defines the strategy (prompts), performs code reviews, and manages the integration (merging).
- **Remote (Cloud Worker)**: Handles environment setup, dependency installation, long-running test execution, and large-scale file modifications.

## Why Cloud Workers vs Local Agents?

| Aspect | Local Agents (e.g., OMO subagents) | Cloud Workers (Jules) |
|--------|-------------------------------------|------------------------|
| **Where it runs** | Your machine, your API keys | Google's cloud sandbox |
| **Who pays** | You (every token) | Google (their quota) |
| **Rate limits** | Shares YOUR limits | Separate quota entirely |
| **Duration** | Minutes (context bound) | Hours (async, detached) |
| **Output** | Returns to conversation | Creates PR for review |

## System Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         OPENCODE + CLOUD WORKERS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    LOCAL (OpenCode Plugin)                       │   │
│   │                                                                  │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │   │
│   │  │  Detection   │──│ Orchestrator │──│    Merge Manager     │   │   │
│   │  │  & Suggest   │  │              │  │   (GitHub API/CLI)   │   │   │
│   │  └──────────────┘  └──────┬───────┘  └──────────────────────┘   │   │
│   │                           │                                      │   │
│   │  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────────────┐   │   │
│   │  │   Reviewer   │──│    Task      │──│    Notification      │   │   │
│   │  │   (Oracle)   │  │   Tracker    │  │      System          │   │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────────┘   │   │
│   │                                                                  │   │
│   │  ┌──────────────────────────────────────────────────────────┐   │   │
│   │  │                  Provider Interface                       │   │   │
│   │  │    CloudWorkerProvider (abstract, multi-provider ready)   │   │   │
│   │  └──────────────────────────────────────────────────────────┘   │   │
│   │                              │                                   │   │
│   └──────────────────────────────│───────────────────────────────────┘   │
│                                  │                                       │
│   ┌──────────────────────────────▼───────────────────────────────────┐   │
│   │                       PROVIDERS                                   │   │
│   │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │   │
│   │  │  Jules (MVP)   │  │  Mock (Tests)  │  │  Future Providers  │  │   │
│   │  │  REST + CLI    │  │  Fake sessions │  │  Copilot, Cursor...│  │   │
│   │  └────────────────┘  └────────────────┘  └────────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │                    REMOTE (Jules Cloud)                          │   │
│   │  • Sandbox environment                                           │   │
│   │  • File edits, dependency installs, test runs                    │   │
│   │  • Auto-PR creation                                              │   │
│   │  • Uses OpenSpec for change tracking (Tier 2)                    │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Two-Tier Tracking System

We use a two-tier tracking approach to maintain visibility at both orchestration and implementation levels.

### Tier 1: Cloud Worker Task Tracking (Our System)

**Purpose:** Track what WE offloaded to cloud workers  
**Storage:** `.opencode/cloud-workers/state.json`  
**Scope:** Orchestration layer

```json
{
  "sessions": [
    {
      "id": "uuid-local-id",
      "provider": "jules",
      "remoteSessionId": "jules_session_xyz",
      "status": "in_progress",
      "prompt": "Add tests to all services",
      "expectedOutcomes": [
        "Tests implemented and passing",
        "Coverage above 80%",
        "No breaking changes introduced"
      ],
      "reviewRound": 1,
      "reviewHistory": [
        {
          "round": 1,
          "approved": false,
          "issues": 2,
          "feedback": "Missing error case tests..."
        }
      ]
    }
  ]
}
```

**Key Features:**
- **expectedOutcomes**: Auto-extracted from prompt using AI (with fallback)
- **reviewHistory**: Full history of all review rounds with summaries

### Tier 2: OpenSpec (Jules' System)

**Purpose:** Track what changes JULES made  
**Storage:** `openspec/changes/` in the PR branch  
**Scope:** Implementation details

We instruct Jules to create OpenSpec, which gives us:
- Structured view of what Jules changed
- Easy diffing of intent vs implementation
- Reusable for review agent analysis

**Prompt instructs Jules to create:**
```
openspec/changes/{task-slug}.md
```


## Component Breakdown

### Detection & Suggestion System

Identifies tasks suitable for cloud offloading and suggests to the user.

**Trigger Conditions:**
- Task complexity (multiple files, refactoring, migration)
- Explicit keywords ("all files", "entire module", "comprehensive tests")
- Duration estimate (would take >10 mins in session)
- Independence check (doesn't need conversation context)

### Task Tracker

The `TaskTracker` is responsible for tracking all cloud worker tasks. It persists state to `.opencode/cloud-workers/tasks.json`, ensuring tasks survive OpenCode restarts and can be resumed in new sessions.

### Provider Interface (`CloudWorkerProvider`)

A standardized interface that allows the plugin to support multiple cloud worker backends. The primary implementation is the `JulesProvider`, which communicates with Google's Jules API.

```typescript
interface CloudWorkerProvider {
    name: string;
    createSession(prompt: string, options: CreateOptions): Promise<SessionResult>;
    getStatus(sessionId: string): Promise<StatusResult>;
    sendFeedback(sessionId: string, feedback: string): Promise<void>;
    cancel(sessionId: string): Promise<void>;
}
```

### Review Loop

When a cloud worker completes its task, the Review Loop:
1. Fetches the resulting PR diff
2. Reads OpenSpec from PR branch (Tier 2)
3. Compares against expectedOutcomes (Tier 1)
4. Uses Oracle agent for analysis
5. If issues found: sends feedback back to Jules
6. If approved: proceeds to merge (human confirmation required)

### Notification System

Handles cross-session continuity:
- **Same session open:** Inject notification + auto-trigger review
- **Session closed:** Queue notification for next session
- **New session:** `/cw status` loads pending tasks

### Tools

The plugin exposes several tools to the OpenCode agent:
- `cloud_worker_start`: Initiates a session with prompt construction
- `cloud_worker_status`: Retrieves current progress
- `cloud_worker_list`: Displays all tracked tasks
- `cloud_worker_feedback`: Sends instructions to a running/paused worker
- `cloud_worker_merge`: Executes the final PR merge (human confirmed)

## Data Flow

1. **Detection**: Agent identifies task suitable for offloading, suggests to user
2. **Delegation**: User accepts → prompt constructed → task saved to Tier 1
3. **Creation**: Plugin creates remote session via Provider API
4. **Polling**: Background scheduler checks Provider every 60s (configurable)
5. **Completion**: Remote worker finishes → creates PR with OpenSpec (Tier 2)
6. **Notification**: Plugin notifies user (inject to session or queue)
7. **Review**: Plugin reviews PR against expectedOutcomes
8. **Iterate or Finalize**:
   - If issues: Feedback sent to remote worker, cycle repeats
   - If approved: Human confirms → PR merged

## Cross-Session Continuity

```
SCENARIO A: Same Session Open
└── Context available → review immediately when PR ready

SCENARIO B: New Session (user runs /cw status)
└── Load tasks.json → check provider status → review in new context

SCENARIO C: Closed & Returned Later
└── tasks.json persisted → /cw status shows pending → resume flow

SCENARIO D: Active Monitoring (session stays open)
└── Background polling → notification when ready → auto-trigger review
```

## Extension Points

### New Providers

To support a new cloud worker (e.g., GitHub Copilot Workspace, Cursor), implement the `CloudWorkerProvider` interface:
- `createSession()`: Start remote work
- `getStatus()`: Poll for progress
- `sendFeedback()`: Send corrections
- `cancel()`: Abort if needed

### Custom Reviewers

Configure a different local agent for the review process by changing the `reviewer_agent` setting. This allows specialized models for security audits or style compliance.
