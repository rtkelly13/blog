import { mutation, query } from './_generated/server';

/**
 * Hello-world Convex example.
 *
 * `get` is a reactive query: every client subscribed to it re-renders the
 * instant the counter changes. `bump` is a mutation that increments a single
 * shared counter. Open the page in two tabs and watch them stay in sync.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db
      .query('counters')
      .withIndex('by_name', (q) => q.eq('name', 'hello'))
      .unique();
    return { message: 'Hello from Convex 👋', count: counter?.count ?? 0 };
  },
});

export const bump = mutation({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db
      .query('counters')
      .withIndex('by_name', (q) => q.eq('name', 'hello'))
      .unique();
    if (counter) {
      await ctx.db.patch(counter._id, { count: counter.count + 1 });
    } else {
      await ctx.db.insert('counters', { name: 'hello', count: 1 });
    }
  },
});
