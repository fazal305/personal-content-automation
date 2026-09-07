// AI is an assistant, never a publisher: every function here returns text for a
// human to review and explicitly save — nothing it produces is written to the DB
// directly. See routes/ai.js and the ContentEditor "Use this" pattern.
const API_URL = 'https://api.anthropic.com/v1/messages';

const BASE_SYSTEM = `You are a writing assistant for a software developer's personal "build in public" content — technical posts about projects, automation, and what they're learning. Write like an actual practitioner sharing real work, not marketing copy. Avoid generic phrases like "unlock the power of", "in today's fast-paced world", "I'm thrilled to announce", "game-changer". Be direct, specific, and concrete. No emoji unless the brand voice explicitly calls for it.`;

export function isAiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 800) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('AI assistant not configured — set ANTHROPIC_API_KEY in .env');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API error: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned a response that could not be parsed as JSON');
  }
}

function brandVoiceContext(config) {
  const parts = [];
  if (config?.tone) parts.push(`Tone: ${config.tone}.`);
  if (config?.brand_name) parts.push(`Author: ${config.brand_name}.`);
  if (config?.default_hashtags) parts.push(`Default hashtags to consider (use only if relevant): ${config.default_hashtags}.`);
  if (config?.cta_preference) parts.push(`Preferred CTA style: ${config.cta_preference}.`);
  return parts.join(' ');
}

function systemFor(config) {
  const voice = brandVoiceContext(config);
  return voice ? `${BASE_SYSTEM} ${voice}` : BASE_SYSTEM;
}

export async function generateDraft({ content, config }) {
  const prompt = `Turn this content idea into a short draft post.

Title: ${content.title}
Hook: ${content.hook || '(none)'}
Notes: ${content.notes || '(none)'}
Source URL: ${content.source_url || '(none)'}

Respond with ONLY this JSON shape, no other text: {"hook": "...", "body": "...", "cta": "...", "hashtags": "..."}`;
  return parseJson(await callClaude(systemFor(config), prompt, 800));
}

const REWRITE_INSTRUCTIONS = {
  concise: 'Make this more concise without losing the key point.',
  professional: 'Make this more professional in tone.',
  conversational: 'Make this more conversational and casual.',
  strengthen_hook: 'Rewrite the opening line only, to make it a stronger, more scroll-stopping hook.',
  improve_cta: 'Strengthen the call to action.',
  simplify: 'Simplify the language and remove jargon.',
  bullets: 'Reformat this as a clear bulleted list.',
};

export async function rewrite({ content, mode, config }) {
  const instruction = REWRITE_INSTRUCTIONS[mode];
  if (!instruction) throw new Error(`Unknown rewrite mode: ${mode}`);
  const prompt = `${instruction}

Text:
${content.body || content.hook || ''}

Respond with ONLY the rewritten text — no preamble, no quotes around it.`;
  return (await callClaude(systemFor(config), prompt, 600)).trim();
}

const PLATFORM_LIMITS = { bluesky: 300, mastodon: 500, threads: 500, linkedin: 3000, instagram: 2200, github: 500 };

export async function repurpose({ content, platform, config }) {
  const limit = PLATFORM_LIMITS[platform.slug] ?? 500;
  const prompt = `Rewrite this as a post for ${platform.display_name} (max ${limit} characters, match that platform's typical style and length).

Title: ${content.title}
Hook: ${content.hook || ''}
Body: ${content.body || ''}
Hashtags: ${content.hashtags || ''}

Respond with ONLY the post text.`;
  return (await callClaude(systemFor(config), prompt, 500)).trim();
}

export async function qualityCheck({ content }) {
  const prompt = `Review this draft for real issues only: weak opening, excessive length, repetitive wording, unclear CTA, unnecessary hashtags, or missing context. Do not invent issues that aren't there.

Hook: ${content.hook || '(none)'}
Body: ${content.body || '(none)'}
CTA: ${content.cta || '(none)'}
Hashtags: ${content.hashtags || '(none)'}

Respond with ONLY this JSON shape: {"issues": ["...", "..."]} (empty array if there are no real issues).`;
  return parseJson(await callClaude(`${BASE_SYSTEM} You are reviewing a draft before it goes out, looking for concrete problems.`, prompt, 400));
}
