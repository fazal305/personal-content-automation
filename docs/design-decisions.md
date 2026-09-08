# Design Decisions

What was researched before building the UI (Phase 0), what got used, and
what got deliberately rejected.

---

### Resource: `ui-ux-pro-max` and `impeccable` design skills

**What we learned**: both carry structured guidance on hierarchy, spacing,
information density, and anti-generic-pattern checklists — directly
applicable to a dense, developer-tool-shaped UI.

**What we adopted**: the `impeccable` skill's `audit` framework structured
the Phase 10 accessibility/responsive review (form labels, sidebar mobile
behavior, table overflow). Its "operate mode" framing (scanability and
consistency outrank expression for task-completion UI) matched this
project's whole premise.

**Why**: this app is a tool someone uses daily, not a marketing page —
"operate" is the right mode, and its guidance (dense information, minimal
decoration, native platform expectations) is what the dark
developer-workspace direction was built around from Phase 1.

**What we intentionally rejected**: neither skill's more expressive/bold
visual directions (used for landing pages or portfolios) — not relevant to
an internal tool.

---

### Resource: Aceternity UI (animated component library)

**What we learned**: a large catalog of Framer Motion + Tailwind component
snippets — spotlight cards, glowing borders, animated backgrounds.

**What we adopted**: nothing directly copied. Considered for one interaction
(a command-palette-style overlay) but ultimately built plain, since the
whole app already has zero motion libraries as a dependency.

**Why rejected (mostly)**: its default aesthetic — glowing borders, spotlight
hover effects, gradient-heavy cards — is exactly the "AI slop" pattern the
brief explicitly warns against. A personal automation tool should look like
a tool, not a SaaS marketing page.

---

### Resource: `no-ai-slop` principles

**What we learned**: a checklist of generic-AI-output tells: meaningless
gradients, unnecessary emoji, fake statistics, "revolutionize your
workflow"-style copy, excessive glassmorphism, cards-inside-cards.

**What we adopted**: used directly as the Phase 10 polish checklist. Also
shaped every page's copy from the start — no marketing language anywhere in
the product (Command Center says "Demo mode — showing seeded sample
content, not a real account," not "Welcome to your content command center!
🚀").

**Why**: this list captures exactly the failure mode a coding assistant
defaults to without explicit direction. Treating it as a checklist rather
than a vibe kept the UI restrained through nine build phases.

---

### Resource: Twenty (open-source CRM)

**What we learned**: solid patterns for data-heavy interfaces — tables with
inline filters, a persistent sidebar, command-oriented navigation.

**What we adopted**: the general shape of Library's filter bar (search +
status + pillar as inline controls above a table) draws on this pattern.

**Why rejected as a deeper reference**: wrong domain (relationship
management, not content lifecycle) and far larger scale (enterprise CRM
vs. a single-user tool) — copying more than the surface pattern would have
imported complexity this project doesn't need.

---

### Resource: Strix, gstack, omniroute/mem/headroom/task-observer

**What we learned**: these are developer-workflow and Claude Code session
tooling (a security-testing agent, a project scaffolder, session-management
utilities) — not design or product references at all.

**What we adopted**: nothing.

**Why rejected**: out of scope for what this research phase was actually
for (informing the product's own design), not a fit regardless of quality.

---

## Core visual decisions (not tied to a specific resource)

**Dark-only, no light theme.** This is a workspace someone uses daily, not
a page rendered for an unknown audience. Committing to one look (documented
directly in `index.css`) is simpler and more consistent than a half-built
theme switcher.

**CSS-variable design tokens, not hardcoded colors.** Nine tokens
(`--color-background` through `--color-danger`) are the only colors used
anywhere in the app. Enforced by convention (Tailwind config maps token
names to CSS variables) rather than a linter — small enough codebase that
this held throughout.

**No animation library.** `prefers-reduced-motion` gets a real global rule;
beyond that, the only motion is CSS transitions on state changes (nav
drawer, hover states) — nothing decorative, nothing that delays
interaction.

**No component library.** Every UI element (buttons, badges, panels) is
hand-written Tailwind, not a shadcn/Aceternity/MUI import. For an app this
size, a component library's abstraction cost outweighs its reuse benefit.
