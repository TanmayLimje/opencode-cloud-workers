# OpenCode Cloud Workers Plugin ☁️👷

**"Local Strategy, Remote Execution"**

A plugin for [OpenCode](https://github.com/google-deepmind/opencode) that enables you to delegate heavy, long-running, or complex coding tasks to asynchronous cloud agents (Cloud Workers), specifically **Google Jules**.

## Features

- 🚀 **Delegation**: Offload tasks like "Refactor this entire module" or "Write tests for this directory" to a cloud worker.
- 🔁 **Polling**: Automatically tracks the status of your cloud sessions in the background.
- 🧠 **AI Review Loop**: Uses your local OpenCode model (Oracle) to review the work produced by the cloud agent.
- 🔄 **Feedback Loop**: If the local review fails, feedback is automatically sent back to the cloud worker for iteration.
- 🔀 **Merge Automation**: (Optional) Merges the resulting PR if the review passes.
- 🔔 **Notifications**: Get toast notifications when a worker finishes or needs attention.

## Installation

This plugin requires an OpenCode environment (v2.0+).

```bash
# In your opencode configuration directory or project
npm install @opencode-ai/cloud-workers
# or with regular opencode plugin installation
```

## Configuration

Add the plugin to your `opencode.json` configuration:

```json
{
  "plugins": [
    "@opencode-ai/cloud-workers"
  ],
  "cloud_workers": {
    "default_provider": "jules",
    "providers": {
      "jules": {
        "api_key_env": "JULES_API_KEY"
      }
    }
  }
}
```

### Environment Variables

You must set the following environment variables in your `.env` or shell:

- `JULES_API_KEY`: Your Google Jules API Key.
- `GITHUB_TOKEN`: (Optional) Required for merge automation features.

## Usage

### Tools

The plugin exposes the following tools to your OpenCode agent:

- **`cloud_worker_start`**: Start a new session.
  - `prompt`: Detailed task description.
  - `repo`: (Optional) Repository URL (auto-detected).
  - `branch`: (Optional) Base branch (auto-detected).
  - `auto_review`: (Default: `true`) Enable the AI review loop.

- **`cloud_worker_status`**: Check the status of a specific session.
- **`cloud_worker_list`**: List all tracked sessions.
- **`cloud_worker_feedback`**: Manually send feedback to a worker.
- **`cloud_worker_merge`**: Manually merge a completed session's PR.

### Example Workflow

1. **User**: "Please verify that all tests pass in the `utils` folder. If not, fix them."
2. **OpenCode**: Calls `cloud_worker_start(prompt="Run tests in utils/ and fix failures")`.
3. **Plugin**: Starts a Jules session and returns a Session ID.
4. **Plugin (Background)**: Polls Jules every 30s.
5. **Jules**: Runs tests, fixes code, creates a PR. Status -> `completed`.
6. **Plugin**: Detects completion. Fetches the patch.
7. **Plugin (Reviewer)**: Uses your local AI model to review the changes.
8. **Plugin**:
    - *If Approved*: Notifies you "Worker Approved! ✅". merge tool becomes available.
    - *If Rejected*: Sends feedback back to Jules. Status -> `in_progress`.

## Architecture

This plugin follows the **"Local Strategy, Remote Execution"** philosophy.

- **Local**: Context, Decision Making, Review, Orchestration.
- **Remote**: Heavy Compute, Sandboxed Execution, Environment Setup.

## License

MIT
