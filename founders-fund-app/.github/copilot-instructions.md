This repository is a small Next.js (App Router) conversion of the "Founders Fund" calculator.

Key facts for an AI coding assistant:

- Project type: Next.js 15+ (App Router). Entry points: `src/app/layout.tsx`, `src/app/page.tsx`.
- State is centralized in `src/context/CalculatorContext.tsx` using a React context and hooks. Most UI components consume `useCalculator()`.
- Primary UI components live under `src/components/` with a Calculator area at `src/components/Calculator/*` (notable files: `AllocationSettings.tsx`, `FoundersTable.tsx`, `InvestorsTable.tsx`). Use these as canonical examples for prop/state patterns.
- Several components are placeholders/TODOs (e.g., `src/components/AI/AIAssistant.tsx`, `src/components/Preview/PreviewArea.tsx`). Implementations should match existing patterns: client components (use 'use client'), minimal local state, and consumption of `useCalculator()` where appropriate.

Build & dev commands (verified from `package.json`):

```bash
npm run dev    # starts Next.js with turbopack
npm run build  # builds for production
npm start      # runs production server after build
npm run lint   # run eslint
```

Important conventions and patterns in this codebase:

- Files under `src/app/` follow the Next.js App Router conventions. Global CSS lives in `src/app/globals.css` and is imported by `layout.tsx`.
- Components that interact with app state use the `CalculatorProvider` wrapper exported from `src/context/CalculatorContext.tsx`. Wrap any new page-level UI with this provider (see `src/app/page.tsx`).
- Client components explicitly opt in with the `'use client'` directive at the top of the file. Keep server/client boundaries minimal: UI, hooks, and local event handlers belong in client components.
- Small UI utility classes like `.panel`, `.btn`, and `.muted` are used across components; prefer reusing these instead of adding new styles unless necessary.

Integration points and external deps:

- `openai` is included in `package.json` but the AI assistant is currently a placeholder. If implementing server-side AI calls, prefer Next.js route handlers or server components to keep API keys server-only. Do not commit secrets.
- `jspdf` and `jspdf-autotable` are included—use `src/components/Preview/PreviewArea.tsx` when implementing PDF export/preview.

Files to inspect first when making changes:

- `src/context/CalculatorContext.tsx` — central state and setter signatures.
- `src/app/page.tsx` — how the provider and top-level tabs are wired.
- `src/components/Calculator/*` — examples of stateful UI (tables, inputs, grid layout).
- `src/components/AI/AIAssistant.tsx` and `src/components/Preview/PreviewArea.tsx` — placeholders with TODOs; good first tasks.

Examples (patterns to follow):

- Use `useCalculator()` to read and update calculator state. Example: in `AllocationSettings.tsx` the component calls `const { view, setView, winStart, setWinStart } = useCalculator()` then binds inputs to these values.
- Tables implement simple local row state (see `FoundersTable.tsx` and `InvestorsTable.tsx`) and expose add/remove/update handlers that accept primitive values. Keep the same ergonomics when adding similar tabular UIs.

Quality gates & tests:

- There are no automated tests in the repo. Before committing, run `npm run dev` and a quick smoke check in the browser (http://localhost:3000) to ensure no runtime errors.
- Run `npm run lint` to catch formatting/ESLint issues.

When proposing changes in PRs:

- Reference the central context file for state shape changes. Add a migration note in the PR body if you change setter names or add required fields.
- For UI work, include screenshots or a short screencast of the working app. For AI or PDF features, include notes on where secrets/config should be stored (Vercel environment variables / local .env — do not commit keys).

If anything in these instructions is unclear or you want more detail (routing, examples for adding a server route, or how to wire OpenAI calls securely), tell me which area to expand.
