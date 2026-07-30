# Ember UI Guide

Read this before building any UI in this repo. It's the practical companion to the "Ember UI" section in `CLAUDE.md` — that section has the rules; this file has the workflow, the folder conventions, and the current catalogue.

## What Ember UI is

Ember UI is the canonical, cross-product component/design system for every Ember product — EmberFlow today, others later. It lives outside this repo, at `~/Desktop/Ember UI/`, so it survives independently of any one product's codebase. EmberFlow *consumes* Ember UI; it never the other way around.

The rule that makes this work: **only polished, production-grade, genuinely reusable pieces belong there.** No experiments, no broken drafts, no one-off glue code. If something is EmberFlow-specific business logic wearing a generic hat, it stays in EmberFlow.

## Before building anything nontrivial

1. **Check the catalogue first.** Open `~/Desktop/Ember UI/README.md` — it's a table of every module already extracted. If something close enough exists, adapt it in place rather than building parallel.
2. **Study `/references` before designing.** The repo root's `/references` folder has local clones of shadcn/ui (as `ui`), Magic UI, Origin UI, Animate UI, Radix UI, Framer Motion, React Bits, Mantine, HeroUI, Chakra UI, Tremor, and Headless UI. For anything nontrivial, look at **at least three** of the relevant ones before writing a line of Ember code. Compare their approaches — what each gets right, what each gets wrong (accessibility gaps, bloat, rigid APIs) — then design the Ember version informed by all of them, not a copy of any one.
3. **Never copy-paste a component wholesale.** Extract the pattern (the interaction model, the accessibility approach, the animation timing), then implement it in Ember's own visual language (dark-first, matte charcoal, floating cards, terracotta accent — see `CLAUDE.md` → Design System).
4. **Build it inside EmberFlow first**, wired to real data, tested against the real app. Don't design components in a vacuum.
5. **Once it's genuinely reusable and polished, extract it** to `~/Desktop/Ember UI/` following the layout below. "Reusable" means: no EmberFlow-specific business logic, no hardcoded copy that only makes sense for invoicing/freelancers, and it would make sense dropped into an unrelated Ember product with only its data/config swapped.

## Extraction layout

Each module is its own folder under `~/Desktop/Ember UI/`, containing whatever subset of the following actually applies:

```
~/Desktop/Ember UI/<module-name>/
├── README.md          # what it is, why it exists, usage example, dependencies, install notes
├── PROMPT.md           # a ready-to-use AI prompt that can recreate/adapt the module from scratch
├── .env.example         # if it needs configuration
├── components/           # UI: .jsx + its .css, no app-specific imports
├── client/               # frontend service/hook code, if it's a backend-integration module
├── api/                  # backend routes, if it's a backend-integration module
├── sql/                  # migrations, if it touches a schema
└── scripts/              # verification/test harnesses
```

`polar-billing/` (backend billing module) and `components/` (currently empty — nothing UI-layer has been extracted yet) are the two entries that exist today. Update `~/Desktop/Ember UI/README.md`'s catalogue table every time something new is added.

## Research sources with no local clone

Browse these directly when a pattern isn't covered by anything in `/references`: reactbits.dev, kokonutui.com, motion.dev, animejs.com, rive.app.

## Current catalogue (keep in sync with `~/Desktop/Ember UI/README.md`)

| Module | Kind | Status |
|---|---|---|
| `polar-billing/` | Backend module | Extracted 2026-07-28 from EmberFlow's Paddle→Polar migration. |
| UI primitives (Button, Card, Table, Badge, etc.) | Components | Not yet extracted — still living only in `frontend/src/components/ui/`. First candidates once a component has stabilized across two or more real EmberFlow screens. |
