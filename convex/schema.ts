import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// One row per audience submission to the "how to make toast" activity.
// `steps` is the ordered list (already profanity-masked on the way in).
// The 5-second moderation buffer is modelled with `revealed`: a submission is
// inserted with `revealed: false`, shown to the presenter immediately, and only
// flipped to `revealed: true` by a scheduled function ~5s later — unless the
// presenter has `hidden` it first.
export default defineSchema({
  toastSubmissions: defineTable({
    talkSlug: v.string(),
    nickname: v.optional(v.string()),
    steps: v.array(v.string()),
    /** Profanity was detected (and masked) in this submission. */
    flagged: v.boolean(),
    /** Has cleared the 5s buffer and may appear on the audience wall. */
    revealed: v.boolean(),
    /** Presenter has pulled this from the wall. */
    hidden: v.boolean(),
    createdAt: v.number(),
  })
    // Wall + moderation both read newest-or-oldest within a single talk.
    .index('by_slug_created', ['talkSlug', 'createdAt']),
});
