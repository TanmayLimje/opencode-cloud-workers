# OpenCode Cloud Workers Plugin ☁️👷

[![CI](https://github.com/ManishModak/opencode-cloud-workers/actions/workflows/ci.yml/badge.svg)](https://github.com/ManishModak/opencode-cloud-workers/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3+-f9f1e1.svg)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!WARNING]
> **Development Preview**: This project is currently in active development. There are no official releases yet, and APIs may change.

**"Local Strategy, Remote Execution"**

A plugin for [OpenCode](https://github.com/sst/opencode) that enables you to delegate heavy, long-running, or complex coding tasks to asynchronous cloud agents (Cloud Workers), specifically **Google Jules**.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

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

The plugin uses a **hybrid config system**:

1. **Global config** (`~/.config/opencode/cloud-workers.json`) - Credentials & defaults
2. **Project config** (`opencode.json` → `cloud_workers`) - Optional overrides
3. **Environment variables** - Fallback for API keys

### Quick Setup

**Option A**: Environment variables only (simplest)

```bash
export JULES_API_KEY="your-jules-api-key"
export GITHUB_TOKEN="ghp_..."  # Optional, for merge
```

**Option B**: Global config file

Create `~/.config/opencode/cloud-workers.json`:

```json
{
  "providers": {
    "jules": { "api_key": "${JULES_API_KEY}" },
    "github": { "token": "${GITHUB_TOKEN}" }
  },
  "defaults": {
    "auto_review": true,
    "max_review_rounds": 3
  }
}
```

**Option C**: Project-specific overrides

Add to `opencode.json`:

```json
{
  "plugins": ["@opencode-ai/cloud-workers"],
  "cloud_workers": {
    "auto_review": false
  }
}
```

See [docs/configuration.md](docs/configuration.md) for full options.

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

See [docs/architecture.md](docs/architecture.md) for detailed system diagrams and component breakdown.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, configuration, first session walkthrough |
| [Architecture](docs/architecture.md) | System design, components, data flow |
| [Configuration](docs/configuration.md) | Full configuration schema and options |
| [Jules API Reference](docs/jules_api_docs/) | Complete Jules API documentation |
| [AGENTS.md](AGENTS.md) | AI agent and contributor guidelines |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to this project |

## Development

```bash
bun install
bun run build
bun run test
bun run typecheck
```

## Roadmap

- Multi-provider support (future)
- Enhanced review loop
- Auto-merge with approval gates

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## License

MIT
