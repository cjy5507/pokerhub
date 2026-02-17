import { relations } from 'drizzle-orm';
import {
  users,
  userFollows,
  userBlocks,
  userSettings,
  boards,
  posts,
  comments,
  postLikes,
  commentLikes,
  bookmarks,
  tags,
  postTags,
  strategyVotes,
  reports,
  pokerHands,
  pokerHandPlayers,
  pokerHandActions,
  pokerHandComments,
  badges,
  userBadges,
  missions,
  userMissions,
  attendance,
  userStreaks,
  pointTransactions,
  xpTransactions,
  notifications,
  chatRooms,
  chatMessages,
  adminLogs,
  threads,
  threadLikes,
  threadReplies,
} from './schema';

// User Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  posts: many(posts),
  comments: many(comments),
  pokerHands: many(pokerHands),
  pokerHandComments: many(pokerHandComments),
  badges: many(userBadges),
  missions: many(userMissions),
  attendance: many(attendance),
  streaks: one(userStreaks, {
    fields: [users.id],
    references: [userStreaks.userId],
  }),
  pointTransactions: many(pointTransactions),
  xpTransactions: many(xpTransactions),
  notifications: many(notifications),
  chatMessages: many(chatMessages),
  postLikes: many(postLikes),
  commentLikes: many(commentLikes),
  bookmarks: many(bookmarks),
  strategyVotes: many(strategyVotes),
  followers: many(userFollows, { relationName: 'following' }),
  following: many(userFollows, { relationName: 'followers' }),
  blockers: many(userBlocks, { relationName: 'blocked' }),
  blocking: many(userBlocks, { relationName: 'blockers' }),
  reports: many(reports),
  adminLogs: many(adminLogs),
  threads: many(threads),
  threadLikes: many(threadLikes),
  threadReplies: many(threadReplies),
}));

// Board Relations
export const boardsRelations = relations(boards, ({ many }) => ({
  posts: many(posts),
}));

// Post Relations
export const postsRelations = relations(posts, ({ one, many }) => ({
  board: one(boards, {
    fields: [posts.boardId],
    references: [boards.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(postLikes),
  bookmarks: many(bookmarks),
  tags: many(postTags),
  strategyVotes: many(strategyVotes),
}));

// Comment Relations
export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'parentComment',
  }),
  replies: many(comments, { relationName: 'parentComment' }),
  likes: many(commentLikes),
}));

// Tag Relations
export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

// Poker Relations
export const pokerHandsRelations = relations(pokerHands, ({ one, many }) => ({
  author: one(users, {
    fields: [pokerHands.authorId],
    references: [users.id],
  }),
  players: many(pokerHandPlayers),
  actions: many(pokerHandActions),
  comments: many(pokerHandComments),
}));

export const pokerHandPlayersRelations = relations(pokerHandPlayers, ({ one }) => ({
  hand: one(pokerHands, {
    fields: [pokerHandPlayers.handId],
    references: [pokerHands.id],
  }),
}));

export const pokerHandActionsRelations = relations(pokerHandActions, ({ one }) => ({
  hand: one(pokerHands, {
    fields: [pokerHandActions.handId],
    references: [pokerHands.id],
  }),
}));

export const pokerHandCommentsRelations = relations(pokerHandComments, ({ one }) => ({
  hand: one(pokerHands, {
    fields: [pokerHandComments.handId],
    references: [pokerHands.id],
  }),
  author: one(users, {
    fields: [pokerHandComments.authorId],
    references: [users.id],
  }),
}));

// Gamification Relations
export const badgesRelations = relations(badges, ({ many }) => ({
  users: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const missionsRelations = relations(missions, ({ many }) => ({
  userMissions: many(userMissions),
}));

export const userMissionsRelations = relations(userMissions, ({ one }) => ({
  user: one(users, {
    fields: [userMissions.userId],
    references: [users.id],
  }),
  mission: one(missions, {
    fields: [userMissions.missionId],
    references: [missions.id],
  }),
}));

// Social Relations
export const chatRoomsRelations = relations(chatRooms, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [chatMessages.roomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
}));

// Notification Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
}));

// Thread Relations
export const threadsRelations = relations(threads, ({ one, many }) => ({
  author: one(users, {
    fields: [threads.authorId],
    references: [users.id],
  }),
  likes: many(threadLikes),
  replies: many(threadReplies),
}));

export const threadLikesRelations = relations(threadLikes, ({ one }) => ({
  user: one(users, {
    fields: [threadLikes.userId],
    references: [users.id],
  }),
  thread: one(threads, {
    fields: [threadLikes.threadId],
    references: [threads.id],
  }),
}));

export const threadRepliesRelations = relations(threadReplies, ({ one }) => ({
  thread: one(threads, {
    fields: [threadReplies.threadId],
    references: [threads.id],
  }),
  author: one(users, {
    fields: [threadReplies.authorId],
    references: [users.id],
  }),
}));
