/**
 * The single source of truth for the reaction emoji set. Pure data — no server
 * imports — so the client (components/Reactions.tsx) can import it directly
 * without pulling Convex server code into the bundle, same pattern as
 * talkConfig.ts. The server (convex/reactions.ts) enforces it as an allow-list
 * so the stream can't be used to push arbitrary/unpleasant content.
 */
export const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '💩'];
