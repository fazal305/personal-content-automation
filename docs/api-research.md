# API Research

Research performed before any integration code was written (Phase 0), later
verified against real accounts where noted. This is the reasoning behind
which platforms got real adapters and which stayed manual-assist.

## Format

```
API:
Purpose:
Why we need it:
Free tier:
Authentication:
Rate limits:
Reliability:
Privacy implications:
Where it fits in the system:
```

---

### GitHub REST/GraphQL API

- **Purpose**: detect meaningful repo activity (releases) as a content-idea trigger
- **Why we need it**: the whole "build in public" premise needs a real activity source, not a fake button
- **Free tier**: yes — 60 req/hr unauthenticated, 5,000 req/hr with a PAT
- **Authentication**: personal access token (optional for public data)
- **Rate limits**: generous enough for a 5-minute poll interval
- **Reliability**: high, stable public API
- **Privacy**: none — only public event data
- **Where it fits**: `adapters/github.js`, `jobs/githubWatch.js`
- **Used?**: Yes. Verified live against a real account (`sindresorhus`) — correctly fetched a real release and created a de-duplicated idea.

### Mastodon API

- **Purpose**: real publish + analytics
- **Why we need it**: fully open, no gatekeeping — the easiest real automation to build honestly
- **Free tier**: yes, always — it's a federated open protocol
- **Authentication**: per-instance OAuth2 app registration, no review process
- **Rate limits**: ~300 req/5min, instance-dependent
- **Reliability**: depends on the chosen instance's uptime
- **Privacy**: standard OAuth scopes; your instance sees what you post (same as any client)
- **Where it fits**: `adapters/mastodon.js`
- **Used?**: Yes, for publishing and analytics. Error-path tested (unconfigured state); not tested against a live account (no throwaway account created for this build — see `docs/learning-notes.md`).

### Bluesky / AT Protocol

- **Purpose**: real publish + analytics
- **Why we need it**: fully open, app-password auth, no business verification anywhere
- **Free tier**: yes
- **Authentication**: app password (not your main password) via `com.atproto.server.createSession`
- **Rate limits**: ~5,000 points/hr, ~35,000/day — generous for personal use
- **Reliability**: high
- **Privacy**: standard, same trust model as any Bluesky client
- **Where it fits**: `adapters/bluesky.js`
- **Used?**: Yes, for publishing and analytics. Same testing status as Mastodon.

### Threads API (Meta)

- **Purpose**: real publish + analytics
- **Why we need it**: matured since 2024 launch; full publish/insights endpoints as of 2026
- **Free tier**: yes, via Meta's Developer Mode self-use path (add yourself as tester, skip full App Review)
- **Authentication**: Meta OAuth
- **Rate limits**: 250 posts/24h, 1,000 replies/24h
- **Reliability**: good, but tied to Meta's broader platform stability
- **Privacy**: Meta's standard data-handling terms apply
- **Where it fits**: registered in the `platforms` table with `supports_publishing = 1`, but **no adapter was built** — Phase 5 scoped to the three zero-setup platforms (GitHub, Mastodon, Bluesky) first; Threads needs a Meta Developer app even for self-use, which wasn't set up for this build.
- **Used?**: Not yet — real capability, unimplemented adapter, honestly marked as a gap rather than faked.

### LinkedIn Posts API

- **Purpose**: considered for publishing
- **Why we need it**: LinkedIn is a natural home for "build in public" content
- **Free tier**: yes for posting (self-serve "Share on LinkedIn" product, `w_member_social` scope, no partner review needed for your own profile)
- **Authentication**: OAuth2, but **standard apps get no refresh token** — only Marketing Developer Platform partners do. Access tokens last 60 days; a solo app has to manually re-run the OAuth flow every ~60 days.
- **Rate limits**: ~100 calls/day/member
- **Reliability**: the API itself is fine; the friction is the reauth cadence
- **Privacy**: analytics require MDP partner access, unavailable to a personal project
- **Where it fits**: **deliberately not automated.** Given the 60-day manual reauth requirement and zero analytics access, LinkedIn is manual-assist: the system shows copy-ready text and a link to LinkedIn, no OAuth app, no stored credentials.
- **Used?**: No (by design, confirmed with the user — see `docs/learning-notes.md`).

### Instagram / Facebook Graph API

- **Purpose**: considered for publishing
- **Why we need it**: common platform for visual build-in-public content
- **Free tier**: yes, but requires converting to a Business/Creator account linked to a Facebook Page — personal accounts are unsupported outright
- **Authentication**: Meta OAuth; Development Mode + self as Admin/Tester avoids full App Review for self-use
- **Rate limits**: 25 published posts/24h
- **Reliability**: good
- **Privacy**: Meta's standard terms
- **Where it fits**: registered with `supports_publishing = 0` — manual-assist. The setup overhead (Business account conversion, Meta Developer app) wasn't worth it for this build's scope.
- **Used?**: No.

### X / Twitter API v2

- **Purpose**: considered for publishing
- **Why we need it**: N/A — ruled out
- **Free tier**: **eliminated February 2026.** New developers are pay-per-use ($0.015/post, $0.005/read, capped 2M reads/month).
- **Authentication**: OAuth2/OAuth1.1
- **Rate limits**: N/A at free tier — there isn't one anymore
- **Reliability**: N/A
- **Privacy**: N/A
- **Where it fits**: nowhere — not registered as a platform at all in this system
- **Used?**: No. Manual/export only would be the fallback if ever added; not worth building for a portfolio project given the real per-post cost.

### Anthropic Claude API

- **Purpose**: optional AI assistance (draft generation, rewrite, repurpose, quality check)
- **Why we need it**: turns a raw idea into a draft faster, without ever auto-publishing
- **Free tier**: no — pay-per-token, but cheap at personal-content volume
- **Authentication**: API key
- **Rate limits**: account-tier dependent
- **Reliability**: high
- **Privacy**: content sent to Anthropic's API when AI features are used — documented in `docs/learning-notes.md` and the README's Privacy section
- **Where it fits**: `adapters/anthropic.js`
- **Used?**: Yes, code-complete and error-path tested; not exercised against a live key in this build environment.

### Link/URL metadata (Open Graph)

- **Purpose**: capture title/description/image when pasting a URL (planned, not built — Experiment 02)
- **Why we need it**: turns "found an interesting article" into a content idea without manual re-typing
- **Free tier**: not applicable — self-fetch + parse `<meta>` tags, no third-party API
- **Where it fits**: would live in a future `adapters/urlMetadata.js`
- **Used?**: No, not built yet.

### Quotes / generic "content" APIs (public-apis list)

- **Purpose**: considered during Phase 0 research
- **Why we need it**: no concrete purpose found — would be decoration, not function
- **Used?**: No. Rejected explicitly: adding an API without a clear reason is exactly the kind of feature bloat this project's brief warns against.
