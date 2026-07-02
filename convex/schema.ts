import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { talkConfigValidator } from './talkConfig';

// Schema for the live-talk realtime backend: talk sessions, presence, reactions,
// and the audience-participation features (Q&A, poll/word-cloud, ordered-actions).
// Audience content is profanity-masked on the way in and auto-hidden if flagged;
// the presenter moderates from the console.
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
    // Break countdown (startBreak/extendBreak/endBreak). The authoritative end
    // timestamp lives here so the projected deck, the console and every /live
    // attendee compute the same remaining time — the same idea as the activity
    // `revealAt` scheduled reveal. `breakStartedAt` sizes the progress bar.
    breakStartedAt: v.optional(v.number()),
    breakEndsAt: v.optional(v.number()),
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

  // Presenter heartbeats: one row per (room, sessionId) for a deck in presenter
  // mode. Lets us detect when more than one presenter is connected to the same
  // talk (stale tab / second device) so they don't fight over the slide. Reaped
  // on a short TTL like presence. See convex/talks.ts presenterPing/presenterCount.
  presenters: defineTable({
    room: v.string(),
    sessionId: v.string(),
    lastSeen: v.number(),
  })
    .index('by_room_lastSeen', ['room', 'lastSeen'])
    .index('by_room_session', ['room', 'sessionId'])
    .index('by_lastSeen', ['lastSeen']),

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

  // Live audience Q&A queue. Anyone submits a question; everyone can upvote it;
  // the presenter answers/hides from the console. Sorted by votes for a natural
  // "top questions" queue. Room-scoped to the live talk (room = talk _id).
  questions: defineTable({
    room: v.string(),
    text: v.string(),
    nickname: v.optional(v.string()),
    votes: v.number(),
    answered: v.boolean(),
    /** Presenter has removed this from the audience-visible queue. */
    hidden: v.boolean(),
    createdAt: v.number(),
  }).index('by_room_created', ['room', 'createdAt']),

  // One row per (question, machine) so a browser can upvote a given question at
  // most once — `questions.votes` is the denormalized tally. machineId is the
  // same pseudo-anonymous localStorage id presence uses.
  questionVotes: defineTable({
    questionId: v.id('questions'),
    machineId: v.string(),
  }).index('by_question_machine', ['questionId', 'machineId']),

  // Live poll / word cloud. The presenter opens a prompt; the audience submits
  // single words; `pollWords` accumulates a per-word tally for the cloud/bars.
  // One poll is `open` per room at a time.
  polls: defineTable({
    room: v.string(),
    prompt: v.string(),
    status: v.union(v.literal('open'), v.literal('closed')),
    createdAt: v.number(),
  }).index('by_room_created', ['room', 'createdAt']),

  pollWords: defineTable({
    pollId: v.id('polls'),
    word: v.string(),
    count: v.number(),
    /** Presenter has blocked this word from the cloud (counted, not shown). */
    hidden: v.optional(v.boolean()),
  })
    .index('by_poll', ['pollId'])
    .index('by_poll_word', ['pollId', 'word']),

  // One row per (poll, machine): the audience answers a poll once, so a single
  // browser can't inflate the word cloud by resubmitting.
  pollSubmitters: defineTable({
    pollId: v.id('polls'),
    machineId: v.string(),
  }).index('by_poll_machine', ['pollId', 'machineId']),

  // Generic "put the actions in order" activity (the toast exercise generalized).
  // The presenter opens an activity with a prompt and a set of pre-defined option
  // labels that stay hidden until `revealAt`. The audience submits their own
  // ordered list of steps; after the reveal time the canonical options appear.
  activities: defineTable({
    room: v.string(),
    prompt: v.string(),
    /** Canonical/example steps, revealed to everyone once `revealed` flips. */
    options: v.array(v.string()),
    /** Target timestamp for the reveal — drives the audience countdown. */
    revealAt: v.union(v.number(), v.null()),
    /** Flipped true by a scheduled function at `revealAt`; gates `options`. */
    revealed: v.boolean(),
    status: v.union(v.literal('open'), v.literal('closed')),
    createdAt: v.number(),
  }).index('by_room_created', ['room', 'createdAt']),

  activitySubmissions: defineTable({
    activityId: v.id('activities'),
    room: v.string(),
    nickname: v.optional(v.string()),
    /** The audience member's ordered list of actions (profanity-masked). */
    steps: v.array(v.string()),
    /** Presenter has removed this from the wall. */
    hidden: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_activity_created', ['activityId', 'createdAt'])
    .index('by_room_created', ['room', 'createdAt']),
});
