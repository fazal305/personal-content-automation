export const LIFECYCLE = ['idea', 'draft', 'in_review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived'];

export const STATUS_LABEL = {
  idea: 'Idea',
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  archived: 'Archived',
};

// Keys map to the design tokens: muted | warning | accent | success | danger
export const STATUS_COLOR = {
  idea: 'muted',
  draft: 'muted',
  in_review: 'warning',
  approved: 'accent',
  scheduled: 'accent',
  publishing: 'warning',
  published: 'success',
  failed: 'danger',
  archived: 'muted',
};

export const CONTENT_TYPES = ['text', 'text+image', 'video', 'thread', 'article'];
export const PRIORITIES = ['low', 'normal', 'high'];
