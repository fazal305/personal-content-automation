# Learning Notes

Concepts learned while building this, in the terms this project actually
made them concrete — not textbook definitions.

## Idempotency

Not an abstract concern — a real bug waiting to happen the moment a poll or
a scheduler tick runs more than once against the same external event. Two
places this mattered directly:

- **`processed_external_events`**: before this table existed (conceptually,
  in an earlier draft of the GitHub-poll design), a restart mid-poll could
  have created the same content idea twice from the same release. The fix
  is a `(source, external_id)` primary key checked *before* inserting, not
  after.
- **`publishing_results.job_id UNIQUE`**: makes double-recording a publish
  a hard database error instead of a silent duplicate row.

Idempotency isn't "try to avoid duplicates" — it's making duplicates
*structurally impossible*, via a constraint the database enforces, not a
check you hope always runs first.

## Atomic job claiming (a mini compare-and-swap)

`UPDATE scheduled_jobs SET status = 'publishing' WHERE id = ? AND status =
'pending'` and checking `changes === 0` afterward is the same pattern as an
atomic compare-and-swap in concurrent programming, just expressed as SQL.
Two overlapping scheduler ticks can both *attempt* to claim the same job;
only one's `UPDATE` actually matches the `WHERE` clause, because the first
one to run already flipped the status. No lock, no queue — the database's
own atomicity does the work.

## Retry with backoff

A failed publish shouldn't retry instantly (that just hammers a possibly-down
API) or retry forever (that hides a real, permanent failure). The pattern
here: increasing delays (2 / 10 / 30 minutes) up to a fixed cap
(`max_retries`), then give up and surface the failure clearly rather than
silently keep trying.

## Polling vs. webhooks

This project polls (GitHub releases, analytics) rather than using webhooks,
because a webhook needs a publicly reachable endpoint — overkill for
something meant to run on a personal machine. Polling with a sensible
throttle (5 minutes for GitHub, 60 minutes for analytics) is the honest
trade-off: slightly delayed, but zero infrastructure.

## Rate limiting (the client side of it)

Not just "don't get rate-limited" — actively respecting a platform's stated
limits by throttling *before* hitting them, not reactively backing off
after a 429. The GitHub poll interval (5 min) and analytics sync interval
(60 min/pair) were both chosen with headroom under the documented limits,
not tuned by trial and error.

## Database design for an evolving product

The `content_variants` and `experiments` tables existed in the schema since
Phase 1 but had no API or UI until Phases 6 and 9 respectively. Designing
the schema slightly ahead of the UI — but only for concepts already
decided, not speculative ones — meant later phases were additive instead of
requiring a migration.

## OAuth token lifecycle (LinkedIn specifically)

Not all OAuth is the same shape. LinkedIn's standard (non-partner) apps get
*no refresh token at all* — just a 60-day access token you must manually
re-authorize. That's a real product decision point, not a minor detail: it's
the reason LinkedIn is manual-assist in this system rather than automated —
building a "connected" state that silently breaks every 60 days would be
worse than being upfront that it's not automated at all.

## AI as assistant, not author

The concrete mechanism, not just the principle: every AI function in this
codebase returns a value the caller must explicitly do something with — a
preview object requiring a "use this" click, or a text string that fills a
form field the user still has to click Save on. There's no code path where
an AI response reaches the database without a human action in between.

## Honest "not enough data"

Content Intelligence (Phase 8) taught this one directly, by producing a
wrong-feeling result on the first test: comparing two pillars with exactly
one post each looked technically valid but was noise, not signal. The fix
was a hard floor (minimum sample sizes) that refuses to output a comparison
below it — an explicit design choice, not a missing feature.
