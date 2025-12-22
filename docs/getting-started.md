# Getting Started with OpenCode Cloud Workers

This guide will help you set up and start using the OpenCode Cloud Workers plugin to delegate complex coding tasks to asynchronous cloud agents.

## Prerequisites

Before installing the plugin, ensure you have the following:

- **OpenCode 2.0+**: The plugin leverages features introduced in OpenCode 2.0.
- **Bun**: The recommended runtime for running OpenCode and its plugins.
- **Jules API Access**: A valid Google Jules API key. You can obtain this from the Google Cloud Console.
- **GitHub Token** (Optional): Required if you plan to use auto-merge or GitHub-specific features.

## Installation

You can install the plugin using `bun`:

```bash
# In your OpenCode configuration directory or project root
bun add @opencode-ai/cloud-workers
```

Alternatively, if you are using the OpenCode plugin manager:

```bash
opencode plugin install @opencode-ai/cloud-workers
```

## Minimal Configuration

Add the following to your `opencode.json` (or `.opencode/config.json`):

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

Make sure to set the environment variable:

```bash
export JULES_API_KEY=your_api_key_here
```

## First Session Walkthrough

Once installed and configured, you can start your first cloud worker session.

1.  **Open OpenCode** in your repository.
2.  **Give a task** to the agent that is complex enough for a cloud worker:
    "I need to refactor the entire authentication module to use JWT instead of sessions. Please handle this using a cloud worker."
3.  **OpenCode will invoke `cloud_worker_start`**:
    The plugin will initialize a Jules session and provide you with a Session ID.
4.  **Monitor Progress**:
    The plugin polls the session status every 30 seconds. You will see updates like:
    - `queued` -> `planning` -> `in_progress`
5.  **Review the Output**:
    When the worker completes its task, it will create a Pull Request. The plugin's local review loop will automatically fetch the changes and perform an initial AI review.
6.  **Provide Feedback or Merge**:
    If the review passes, you can merge the PR using `cloud_worker_merge`. If changes are needed, you can send feedback using `cloud_worker_feedback`.

## Common Issues & Troubleshooting

### API Key Errors
If you see authentication errors, verify that `JULES_API_KEY` is correctly set in your environment and matches the name specified in your configuration.

### Session Timeouts
Complex tasks may take a long time. If a session seems stuck, you can check the provider's console (a link is usually provided in the session start message).

### GitHub Permission Issues
For merge automation, ensure your `GITHUB_TOKEN` has `repo` scope and is correctly exported.

### Plugin Not Loading
Check the OpenCode logs for any initialization errors. Ensure you are using a compatible version of OpenCode (2.0+).
