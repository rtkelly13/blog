import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Enforce the presence TTL server-side: prune machines that stopped pinging,
// so the attachment count is correct even after everyone leaves a room.
crons.interval(
  'reap expired presence',
  { minutes: 1 },
  internal.presence.reapExpired,
  {},
);

// Reactions are short-lived; sweep the leftovers.
crons.interval(
  'reap expired reactions',
  { minutes: 1 },
  internal.reactions.reapExpired,
  {},
);

// Presenter heartbeats are short-lived; sweep stale sessions so the
// concurrent-presenter count is accurate.
crons.interval(
  'reap expired presenters',
  { minutes: 1 },
  internal.talks.reapPresenters,
  {},
);

export default crons;
