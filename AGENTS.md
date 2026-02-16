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
bun run format
```

### Fixing linting and formatting errors

```bash
bun run fix
```
