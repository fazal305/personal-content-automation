// Publishing step for one scheduled job. Real platform adapters land in Phase 5 —
// until a platform's adapter exists, publishing always runs as a dry run: the full
// pipeline (claim -> attempt -> record result -> event) executes for real, but no
// external API is ever called. This is Module: Test Mode / Dry Run, applied honestly
// rather than faked as a real publish.
import { logEvent } from '../db/index.js';
import { mastodonAdapter } from '../adapters/mastodon.js';
import { blueskyAdapter } from '../adapters/bluesky.js';

// Real, testable publish targets. LinkedIn/Instagram stay out of this registry on
// purpose — see docs/api-research.md for why they're manual-assist here instead.
export const ADAPTERS = {
  mastodon: mastodonAdapter,
  bluesky: blueskyAdapter,
};

export async function attemptPublish({ job, content, platform }) {
  const isDryRun = job.dry_run === 1 || !ADAPTERS[platform.slug];

  logEvent({
    event_type: 'PUBLISH_STARTED',
    entity_type: 'job',
    entity_id: job.id,
    message: `${content.title} -> ${platform.display_name}${isDryRun ? ' (dry run)' : ''}`,
  });

  if (isDryRun) {
    // Simulated success — no network call. This is the honest default until an
    // adapter for this platform is registered, or the operator explicitly disables DRY_RUN.
    return { success: true, externalPostId: `dry-run-${job.id}`, externalUrl: null, simulated: true };
  }

  try {
    const result = await ADAPTERS[platform.slug].publish(content);
    return { success: true, externalPostId: result.id ?? null, externalUrl: result.url ?? null, simulated: false };
  } catch (err) {
    return { success: false, error: err.message, simulated: false };
  }
}
