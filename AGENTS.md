# Addon Manager Development Guide

## Overview

Addon manager is a small CLI tool built to help view and manage your microsoft flight simulator addons.

## Project Structure

```
addon-manager/
└── src/ # Main application code
    └── utils/ # Small reusable utility functions

```

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Addon Manager Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun (https://bun.sh/docs)
- **Package Manager**: Bun (https://bun.sh/docs/pm/cli/install)
- **Testing**: Bun (https://bun.sh/docs/test)
- **Console Helpers**: Clack (https://github.com/bombshell-dev/clack)
- **Validation**: Zod (https://github.com/colinhacks/zod)
- **File System**: Node:fs/promises (https://nodejs.org/api/fs.html)
- **File System**: Bun:fs (https://bun.sh/docs/runtime/file-io)

## Sentry Instrumentation

When adding new code, always instrument with Sentry:

**Spans** — wrap functions using `wrapWithSpan()` from `src/sentry.ts`:
- `op`: use something like: `'cli.command'`, `'cli.task'`, `'db.query'`, `'db.transaction'`, `'utils.function'`, etc.
- Add relevant attributes (counts, paths, identifiers)

**Logs** — use `Sentry.logger` (not `console`):
- `Sentry.logger.info(Sentry.logger.fmt\`...\`)`
- `Sentry.logger.warn(...)` / `Sentry.logger.error(...)`

**Metrics** — emit at meaningful boundaries:
- `Sentry.metrics.count(name, value)` — for events/totals
- `Sentry.metrics.gauge(name, value)` — for current state
- `Sentry.metrics.distribution(name, value)` — for timing/sizes

**Exceptions** — capture in error handlers:
- `Sentry.captureException(error)`

## Commands

### Dev setup and running

```bash
bun run start
```

### Building

```bash
bun run build
```

### Testing

```bash
bun run test
```

### Type checking

```bash
bun run typecheck
```

### Linting

```bash
bun run lint
```

### Formatting

```bash
bun run fix
```

### Fixing linting and formatting errors

```bash
bun run fix
```
