---
trigger: always_on
---

About API design and project structure:
- Always use camelCase for field keys in requests and responses
- Always create new files with this name format: [name in kebab-case].[type].[extension]. Example: episodes.schemas.ts, external-tasks.routes.ts
- Always use kebab-case for directory names
- Never return the user password

About TypeScript usage:

- Always use pnpm as package manager
- Always check that new npm dependencies to be installed are not deprecated
- You can see [package.json](mdc:package.json) for packages already installed
- Always put the import statements at the top of the files

About Cloudflare usage:

- Always use Cloudflare's native way to code and avoid using third-party packages unless absolutely necessary
- Never use the '@cloudflare/workers-types' package, that is deprecated and not needed
