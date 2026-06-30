import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// A client is "present" if it has been seen within this window. Clients
// heartbeat well inside it (see usePresence), so a few missed beats = gone.
const WINDOW_MS = 30_000;

/**
 * Heartbeat: upsert this machine's presence in a room, and reap anyone in the
 * room who's gone stale. Reaping here (rather than on a timer) keeps the live
 * count accurate as long as *someone* is present — every beat prunes leavers.
 */
export const heartbeat = mutation({
  args: { room: v.string(), machineId: v.string() },
  handler: async (ctx, { room, machineId }) => {
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

    // Reap stale rows for this room.
    const stale = await ctx.db
      .query('presence')
      .withIndex('by_room_lastSeen', (q) =>
        q.eq('room', room).lt('lastSeen', now - WINDOW_MS),
      )
      .collect();
    await Promise.all(stale.map((row) => ctx.db.delete(row._id)));
  },
});

/**
 * Live count of distinct machines present in a room. One row per machineId, so
 * the row count *is* the de-duplicated head-count. Reactive: re-runs whenever
 * the presence table changes (i.e. on every heartbeat / reap).
 */
export const count = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const cutoff = Date.now() - WINDOW_MS;
    const live = await ctx.db
      .query('presence')
      .withIndex('by_room_lastSeen', (q) =>
        q.eq('room', room).gt('lastSeen', cutoff),
      )
      .collect();
    return live.length;
  },
});
