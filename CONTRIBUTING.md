# Contributing to OpenCode Cloud Workers 👋

Welcome! We are excited that you are interested in contributing to OpenCode Cloud Workers. This project is an OpenCode plugin that delegates tasks to cloud workers (Jules), following our core philosophy: **Local Strategy, Remote Execution**. We prioritize keeping context and decision-making local while offloading heavy computation to the cloud.

## Prerequisites

To contribute to this project, you will need the following tools installed:
- Bun 1.3 or higher
- Node.js 20 or higher

## Development Setup

Follow these steps to set up your local development environment:

1. Install dependencies:
   ```bash
   bun install
   ```

2. Build the project:
   ```bash
   bun run build
   ```

3. Run tests:
   ```bash
   bun run test
   ```

4. Run type checking:
   ```bash
   bun run typecheck
   ```

## Types of Contributions

We welcome and appreciate various forms of contributions:
- **New Providers**: Implementing support for new cloud worker platforms.
- **Bug Fixes**: Identifying and resolving issues in the codebase.
- **Documentation**: Enhancing clarity in guides, READMEs, and API references.
- **Tests**: Increasing test coverage and adding regression tests.

## Code Style

To maintain code quality and consistency, please adhere to the following standards:
- **General Guidelines**: Follow the principles outlined in [AGENTS.md](../AGENTS.md).
- **Indentation**: Use 4-space indentation.
- **Quotes**: Use double quotes for all strings.
- **Validation**: Use Zod for schema definitions and data validation.
- **Error Handling**: Do not use `try/catch` blocks. Use early returns and result-based patterns instead.

## Design Review

For all new features or additional providers, a design review is required before implementation begins. Please start by opening an issue to discuss your proposal. This helps ensure that the new functionality aligns with the project's architectural goals and "Local Strategy, Remote Execution" philosophy.

## Pull Request Process

When submitting a Pull Request (PR):
- Keep PRs small, atomic, and focused on a single change.
- Always link the PR to the relevant issue it addresses.
- Ensure that all CI checks (tests, typecheck, build) pass successfully.
- Provide a concise summary of the changes and any necessary context for reviewers.

## Issue Reporting

When reporting issues or suggesting improvements:
- Use the GitHub issue tracker at [https://github.com/ManishModak/opencode-cloud-workers](https://github.com/ManishModak/opencode-cloud-workers).
- Provide a clear and descriptive title.
- Include a detailed description of the problem or suggestion.
- For bugs, provide clear steps to reproduce and details about your environment (OS, Bun version).
