// Shared helper for turning a content row into plain post text. Each adapter still
// applies its own length limit — platforms differ, and truncating here would hide that.
export function buildStatusText(content) {
  return [content.hook, content.body, content.hashtags].filter(Boolean).join('\n\n');
}
