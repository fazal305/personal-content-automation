# Personal Content Automation

A personal content operating system — capture ideas, draft, review, approve,
schedule, and publish across platforms, with real automation only where a
free, individual-friendly API genuinely allows it.

**Status:** Phase 1 (Foundation) complete. Full README, architecture docs,
and API research will land in Phase 11.

## Quick start

```bash
npm install
cp .env.example .env
npm run db:migrate --workspace server   # creates data/content.db
node server/src/db/seedDemo.js          # optional: seed demo content
npm run dev:server                      # http://localhost:4000
npm run dev:client                      # http://localhost:5173
```

## What's real automation vs. manual-assist

Not every platform has a free API an individual can use for their own
account. This system is explicit about the difference — see the
`platforms` table (`supports_publishing`, `supports_analytics`) and
`docs/api-research.md` (added in a later phase) for the reasoning.
