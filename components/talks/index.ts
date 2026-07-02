// Public components for the talks feature — embeddable in MDX slides and used by
// the talk/live pages.
//
// SpectacleDeck is intentionally NOT re-exported here: present.tsx imports it via
// next/dynamic for code-splitting, and routing it through this barrel would pull
// Spectacle (a heavy dependency) into every consumer of the module.
export { default as EmojiTop5 } from './EmojiTop5';
export { default as LivePoll } from './LivePoll';
export { default as OrderedActions } from './OrderedActions';
export { default as QuestionQueue } from './QuestionQueue';
export { default as RateLimitNotice } from './RateLimitNotice';
export { default as TalkCard } from './TalkCard';
export { default as TalkTimer } from './TalkTimer';
