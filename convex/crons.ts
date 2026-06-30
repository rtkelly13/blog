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

export default crons;
