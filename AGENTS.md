# AGENTS.md

## Commands
- Build: `bun run build`
- Typecheck: `bun run typecheck`
- Test all: `bun run test`
- Test single: `bun run test <file-or-pattern>` (e.g., `bun run test session-manager`)

## Code Style
- **TypeScript**: Strict mode, ES2022 target, ESNext modules. Never use `as any` or `@ts-ignore`.
- **Formatting**: Double quotes, 4-space indent, no trailing commas in single-line.
- **Imports**: External packages first, then relative. Group by domain.
- **Naming**: camelCase for variables/functions, PascalCase for classes/types/interfaces.
- **Errors**: Create custom Error classes extending Error (see `JulesAPIError`). Never empty catch blocks.
- **Validation**: Use Zod schemas for runtime validation.
- **Async**: Use async/await, not raw Promises. Handle errors with try/catch.
- **Logging**: Prefix with module name in brackets, e.g., `[CloudWorkerLoop]`.

<!-- OPENSPEC:START -->
## OpenSpec
See `@/openspec/AGENTS.md` for proposals, specs, and change workflows.
<!-- OPENSPEC:END -->