# Configuration Guide

The OpenCode Cloud Workers plugin uses a **hybrid configuration system** that supports both global and project-level settings.

## Configuration Locations

| Location | Purpose | Priority |
|----------|---------|----------|
| `~/.config/opencode/cloud-workers.json` | Global credentials & defaults | Base |
| `opencode.json` → `cloud_workers` section | Project-specific overrides | Highest |
| Environment variables | Fallback for API keys | Lowest |

> **Note:** You can use ONLY the global config without any project config. Project config is optional.

## Quick Start

### 1. Create Global Config

Create `~/.config/opencode/cloud-workers.json`:

```json
{
  "providers": {
    "jules": {
      "api_key": "${JULES_API_KEY}"
    },
    "github": {
      "token": "${GITHUB_TOKEN}"
    }
  },
  "defaults": {
    "auto_review": true,
    "max_review_rounds": 3,
    "polling_interval_ms": 30000
  }
}
```

The `${VAR_NAME}` syntax allows referencing environment variables.

### 2. (Optional) Project Overrides

Add to your project's `opencode.json`:

```json
{
  "cloud_workers": {
    "auto_review": false,
    "polling_interval_ms": 60000
  }
}
```

## Configuration Schema

### Global Config (`cloud-workers.json`)

```typescript
{
  "providers": {
    "jules": {
      "api_key": string,      // API key or ${ENV_VAR}
      "base_url": string,     // Optional: custom API URL
      "api_version": string   // Optional: API version
    },
    "github": {
      "token": string         // GitHub token for merge
    }
  },
  "defaults": {
    "default_provider": string,     // Default: "jules"
    "auto_review": boolean,         // Default: true
    "max_review_rounds": number,    // Default: 3
    "polling_interval_ms": number   // Default: 30000
  }
}
```

### Project Config (`opencode.json` → `cloud_workers`)

```typescript
{
  "cloud_workers": {
    "default_provider": string,     // Override provider
    "auto_review": boolean,         // Override auto-review
    "max_review_rounds": number,    // Override review rounds
    "polling_interval_ms": number   // Override polling
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default_provider` | `string` | `"jules"` | Provider to use |
| `auto_review` | `boolean` | `true` | Auto-review completed work |
| `max_review_rounds` | `number` | `3` | Max review iterations |
| `polling_interval_ms` | `number` | `30000` | Status poll interval (ms) |

### Provider: Jules

| Option | Default | Description |
|--------|---------|-------------|
| `api_key` | - | Jules API key (required) |
| `base_url` | `https://jules.googleapis.com` | API base URL |
| `api_version` | `v1alpha` | API version |

### Provider: Github

| Option | Default | Description |
|--------|---------|-------------|
| `token` | - | GitHub token for PR merge |

## Environment Variables

These are used as fallback if not set in config:

- `JULES_API_KEY` - Jules API key
- `GITHUB_TOKEN` - GitHub token for merge automation

## Examples

### Minimal (Env Vars Only)

Set environment variables and you're done:

```bash
export JULES_API_KEY="your-key"
export GITHUB_TOKEN="ghp_xxx"
```

### Global Config with Env Interpolation

```json
{
  "providers": {
    "jules": { "api_key": "${JULES_API_KEY}" },
    "github": { "token": "${GITHUB_TOKEN}" }
  }
}
```

### Disable Auto-Review for a Project

In project's `opencode.json`:

```json
{
  "cloud_workers": {
    "auto_review": false
  }
}
```

### Custom Jules API Endpoint

```json
{
  "providers": {
    "jules": {
      "api_key": "${JULES_API_KEY}",
      "base_url": "https://custom.jules.com",
      "api_version": "v1beta"
    }
  }
}
```
