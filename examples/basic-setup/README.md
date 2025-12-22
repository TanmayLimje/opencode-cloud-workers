# Basic Setup Example

Minimal configuration to get started with OpenCode Cloud Workers.

## Prerequisites

1. OpenCode 2.0+
2. Jules API access
3. GitHub token with repo permissions

## Setup

1. Copy `opencode.json` to your project root
2. Set environment variables:

```bash
export JULES_API_KEY="your-jules-api-key"
export GITHUB_TOKEN="your-github-token"
```

3. Start a cloud worker session:

```
cloud_worker_start "Implement user authentication with JWT"
```

## What This Config Does

- Uses Jules as the default provider
- Polls every 30 seconds (default)
- Enables AI review of generated PRs (default)
- Requires manual merge approval (default)
