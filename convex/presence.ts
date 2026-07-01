import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { liveTalkForRoom, resolveConfig } from './talks';

// Presence TTL: a client counts as "here" only if it pinged within this window.
// Clients heartbeat well inside it (see usePresence ~10s), so a couple of missed
// pings drops them. The scheduled reaper (crons.ts) enforces the TTL server-side
// so the count is correct even after a room empties out.
export const TTL_MS = 30_000;
// How long a first-seen join stays in the `recentJoins` feed for clients to toast.
const JOIN_FEED_MS = 15_000;

/**
 * Heartbeat: continually ping last-seen for this machine in a room (pure upsert
 * — expiry is handled by the TTL window in `count` and the scheduled reaper).
 * The first time a machine is seen in a room it's also recorded in `attendees`,
 * which makes it surface in `recentJoins` exactly once — a return after the TTL
 * is already known, so it won't re-trigger.
 */
export const heartbeat = mutation({
  args: { room: v.string(), machineId: v.string() },
  handler: async (ctx, { room, machineId }) => {
    // Server-side gate: only count presence for a live talk that has presence
    // enabled. A stale/demo/ended room is dropped silently (no client error).
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || !resolveConfig(talk).presence) return;

    const now = Date.now();
    const mine = await ctx.db
      .query('presence')
      .withIndex('by_room_machine', (q) =>
        q.eq('room', room).eq('machineId', machineId),
      )
      .unique();

    if (mine) {
      await ctx.db.patch(mine._id, { lastSeen: now });
    } else {
      await ctx.db.insert('presence', { room, machineId, lastSeen: now });
    }

    // First-ever sighting in this room → record it (drives the one-time toast).
    const known = await ctx.db
      .query('attendees')
      .withIndex('by_room_machine', (q) =>
        q.eq('room', room).eq('machineId', machineId),
      )
      .unique();
    if (!known) {
      await ctx.db.insert('attendees', { room, machineId, firstSeen: now });
    }
  },
});

/**
 * Recent first-time joins for a room (within the feed window), newest data via
 * reactive updates. Clients toast each id they haven't shown yet. Intentionally
 * anonymous — just an id + timestamp, no machineId leaves the server.
 */
export const recentJoins = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const cutoff = Date.now() - JOIN_FEED_MS;
    const joins = await ctx.db
      .query('attendees')
      .withIndex('by_room_firstSeen', (q) =>
        q.eq('room', room).gt('firstSeen', cutoff),
      )
      .collect();
    return joins.map((j) => ({ id: j._id, at: j.firstSeen }));
  },
});

/**
 * Live, de-duplicated attachment count for a room: machines whose last ping is
 * within the TTL. One row per machineId, so the row count *is* the head-count.
 * Reactive — re-runs on every heartbeat / reap, so it stays current as the talk
 * runs and decrements as people leave.
 */
export const count = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const cutoff = Date.now() - TTL_MS;
    const here = await ctx.db
      .query('presence')
      .withIndex('by_room_lastSeen', (q) =>
        q.eq('room', room).gt('lastSeen', cutoff),
      )
      .collect();
    return here.length;
  },
});

/**
 * Scheduled (crons.ts) TTL reaper: delete every presence row whose last ping is
 * older than the TTL, across all rooms. Keeps the table bounded and enforces
 * expiry independent of any client still heartbeating.
 */
export const reapExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TTL_MS;
    const expired = await ctx.db
      .query('presence')
      .withIndex('by_lastSeen', (q) => q.lt('lastSeen', cutoff))
      .collect();
    await Promise.all(expired.map((row) => ctx.db.delete(row._id)));
  },
});
