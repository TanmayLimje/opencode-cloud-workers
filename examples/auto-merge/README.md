# Auto-Merge Example

High-automation configuration for trusted workflows.

## Prerequisites

1. OpenCode 2.0+
2. Jules API access
3. GitHub token with repo and workflow permissions

## Setup

1. Copy `opencode.json` to your project root
2. Set environment variables:

```bash
export JULES_API_KEY="your-jules-api-key"
export GITHUB_TOKEN="your-github-token"
```

## What This Config Does

- **Faster polling**: Checks status every 15 seconds
- **Extended timeout**: Allows sessions up to 2 hours
- **Auto feedback**: Sends review feedback automatically (up to 3 rounds)
- **Auto merge**: Merges PRs automatically when:
  - All CI checks pass
  - Review loop completes successfully
- **Branch cleanup**: Deletes feature branch after merge

## When to Use

- Trusted repositories with good CI coverage
- Low-risk changes (dependency updates, formatting, simple features)
- When you want minimal manual intervention

## Caution

Auto-merge bypasses manual review. Ensure your CI pipeline catches issues.
