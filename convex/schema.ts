import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { talkConfigValidator } from './talkConfig';

// One row per audience submission to the "how to make toast" activity.
// `steps` is the ordered list (already profanity-masked on the way in).
// The 5-second moderation buffer is modelled with `revealed`: a submission is
// inserted with `revealed: false`, shown to the presenter immediately, and only
// flipped to `revealed: true` by a scheduled function ~5s later — unless the
// presenter has `hidden` it first.
export default defineSchema({
  // Convex Auth tables (users/sessions/accounts/etc). We override `users` to
  // carry the GitHub `login` so mutations can allowlist admins by username.
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    githubLogin: v.optional(v.string()),
  })
    .index('email', ['email'])
    .index('phone', ['phone']),

  // A live talk SESSION (distinct from the MDX talk content). The presenter
  // "starts" one; audience joins whichever is currently `live` — that's the
  // abstraction that lets presence/chat attach to "the current talk" without
  // anyone needing a room id. Each start is a fresh session (its _id is the room).
  talks: defineTable({
    slug: v.string(),
    title: v.string(),
    status: v.union(v.literal('live'), v.literal('ended')),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    // Feature config chosen at start (optional: talks started before configs
    // existed fall back to DEFAULT_CONFIG in code). See convex/talkConfig.ts.
    config: v.optional(talkConfigValidator),
    // Presenter's current slide index, published in follow mode via setSlide.
    currentSlide: v.optional(v.number()),
  }).index('by_status', ['status']),

  // Minimal "hello world" example: a single named counter, bumped by anyone,
  // streamed live to every connected client. See convex/hello.ts.
  counters: defineTable({
    name: v.string(),
    count: v.number(),
  }).index('by_name', ['name']),

  // Pseudo-anonymous presence: one row per (room, machineId), refreshed by a
  // client heartbeat. `machineId` is a random UUID the browser keeps in
  // localStorage — no PII, and it de-duplicates a browser's tabs/reloads.
  // Rows older than the liveness window are reaped on heartbeat. See
  // convex/presence.ts.
  presence: defineTable({
    room: v.string(),
    machineId: v.string(),
    lastSeen: v.number(),
  })
    .index('by_room_lastSeen', ['room', 'lastSeen'])
    .index('by_room_machine', ['room', 'machineId'])
    // Global, room-agnostic range scan for the scheduled TTL reaper.
    .index('by_lastSeen', ['lastSeen']),

  // Persistent first-seen record per (room, machineId). Unlike `presence` this is
  // never reaped — it's the memory that lets a machine fire a "joined" toast only
  // the FIRST time it appears in a room. A machine that leaves (presence expires)
  // and returns is already known here, so it doesn't re-trigger.
  attendees: defineTable({
    room: v.string(),
    machineId: v.string(),
    firstSeen: v.number(),
  })
    .index('by_room_machine', ['room', 'machineId'])
    .index('by_room_firstSeen', ['room', 'firstSeen']),

  // Ephemeral emoji reactions that float up on screen. A `count` lets a client
  // debounce rapid taps into one row. Reaped on a short window by the cron.
  reactions: defineTable({
    room: v.string(),
    emoji: v.string(),
    count: v.number(),
    at: v.number(),
  }).index('by_room_at', ['room', 'at']),

  // Persistent per-talk tally of reactions (the ephemeral `reactions` rows are
  // reaped, so totals for the closing stats chart accumulate here instead).
  reactionTotals: defineTable({
    room: v.string(),
    emoji: v.string(),
    total: v.number(),
  })
    .index('by_room', ['room'])
    .index('by_room_emoji', ['room', 'emoji']),

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
