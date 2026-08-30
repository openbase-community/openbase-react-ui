# openbase-ui

Shared React component library for Openbase web frontends — the common layer between the Openbase CLI's local React app and the Openbase Cloud React app, also consumed as a workspace package by generated project frontends, where it appears as a vendored [Multi](https://github.com/openbase-community) subrepo in the project workspace (built via `pnpm --filter openbase-ui build` in the app's `prepare-client` step).

## What's in here

- `src/components/` — Openbase-specific product components: `AgentChatPanel` (agent chat UI), `ProjectLayout` / `ProjectRoutesWithChat` (project shell + routing), and the schema/introspection views (`ModelsView`, `ModelsRelationshipsView`, `SerializersView`, `EndpointPage`-related views, `TasksView`, `CodeView`, `WebAppView`).
- `src/components/ui/` — the shadcn/Radix primitive kit (button, dialog, chart, table, …) shared so consumers don't each vendor their own copy. Note: template-generated apps ALSO scaffold a local copy of this kit into their own `src/components/ui`; an app importing from `openbase-ui` gets these, an app using its local scaffold does not — don't assume the two are in sync.
- `src/pages/` — full pages for the project console (ProjectHome, ModelsPage, EndpointsPage, CommandsPage, AdminPage, ProjectSettingsPage).
- `src/contexts/` — `ProjectContext`, `AgentChatContext`.
- `src/hooks/` — `use-apps`, `use-chat-api`, `use-mobile`.
- `src/lib/` — API/emoji/classname utilities.

## Consuming

The package ships compiled output only (`dist/`, ESM + type declarations); import everything from the root barrel:

```ts
import { AgentChatPanel, ProjectLayout, useChatApi } from "openbase-ui";
```

All UI-framework dependencies (React, Radix, react-hook-form, recharts, etc.) are **peerDependencies** — the consuming app provides them. Styling assumes the consumer has Tailwind configured with the shadcn HSL design-token convention (`--background`, `--primary`, …), which the Openbase app templates set up.

## Developing

```bash
pnpm build   # barrelsby (regenerates index.ts barrels) + tsc + tsc-alias
pnpm dev     # watch mode: barrels + tsc + alias rewriting concurrently
```

Barrel files (`index.ts`) are generated — edit source files, not barrels. In a Multi workspace, consumers resolve this package via the workspace protocol, so `pnpm build` here is enough for changes to appear in a consuming app's next build.

## Versioning / publishing

Versioned in `package.json` (semver); consumed via the pnpm workspace in development. Keep changes backward-compatible where possible — multiple Openbase apps and generated project workspaces consume this package, so breaking changes fan out.
