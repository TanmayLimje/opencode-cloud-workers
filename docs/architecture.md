# Architecture Overview

The OpenCode Cloud Workers plugin is built on the philosophy of **"Local Strategy, Remote Execution."**

## Philosophy: Local Strategy, Remote Execution

This design pattern ensures that while heavy computation and execution happen in isolated cloud environments, the intelligence, context, and final decision-making remain local to your development environment.

- **Local (OpenCode)**: Holds the project context, defines the strategy (prompts), performs code reviews, and manages the integration (merging).
- **Remote (Cloud Worker)**: Handles environment setup, dependency installation, long-running test execution, and large-scale file modifications.

## System Diagram

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│    OpenCode     │──────▶│     Plugin      │──────▶│   Jules API     │
│  (Orchestrator) │       │ (SessionMgr)    │       │ (Cloud Worker)  │
│                 │       │                 │       │                 │
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
        ▲                          │                         │
        │                          ▼                         ▼
        │                 ┌─────────────────┐       ┌─────────────────┐
        │                 │                 │       │                 │
        └─────────────────┤   Review Loop   │◀──────┤   GitHub PR     │
          (Oracle Agent)  │ (Patch Review)  │       │ (Artifacts)     │
                          │                 │       │                 │
                          └─────────────────┘       └─────────────────┘
```

## Component Breakdown

### SessionManager
The `SessionManager` is responsible for tracking all active and historical cloud worker sessions. It persists the state to `.opencode/cloud-workers/state.json`, ensuring that sessions survive OpenCode restarts.

### Provider Interface (`RemoteWorkerProvider`)
A standardized interface that allows the plugin to support multiple cloud worker backends. The primary implementation is the `JulesProvider`, which communicates with Google's Jules API.

### Review Loop
When a cloud worker completes its task, the Review Loop fetches the resulting patch or PR. It uses a local AI agent (defaulting to "Oracle") to analyze the changes against the original prompt. If issues are found, it can automatically send feedback back to the worker.

### Tools
The plugin exposes several tools to the OpenCode agent:
- `cloud_worker_start`: Initiates a session.
- `cloud_worker_status`: Retrieves current progress.
- `cloud_worker_list`: Displays all tracked sessions.
- `cloud_worker_feedback`: Sends instructions to a running/paused worker.
- `cloud_worker_merge`: Executes the final PR merge.

## Data Flow

1.  **Delegation**: The user's request is translated into a `cloud_worker_start` call.
2.  **Creation**: The Plugin creates a remote session via the Provider API.
3.  **Persistence**: The session details are saved by the `SessionManager`.
4.  **Polling**: A background scheduler periodically checks the Provider for status updates.
5.  **Completion**: Once the remote worker finishes, it creates a GitHub PR.
6.  **Review**: The Plugin fetches the PR patch and passes it to the local Review Loop.
7.  **Iterate or Finalize**:
    - If rejected: Local feedback is sent to the remote worker, restarting the cycle.
    - If approved: The user is notified, and the PR can be merged manually or automatically.

## Extension Points

### New Providers
To support a new cloud worker (e.g., a future OpenAI or Anthropic coding agent), you can implement the `RemoteWorkerProvider` interface. This requires defining how to:
- Create a session.
- Poll for status.
- Send feedback.
- Retrieve artifacts (patches/PRs).

### Custom Reviewers
You can configure a different local agent or model for the review process by changing the `reviewer_agent` setting. This allows you to use specialized models for security audits or style compliance.
