import { pgTable, uuid, varchar, text, timestamp, integer, boolean, pgEnum, jsonb, date, primaryKey, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'moderator']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'banned', 'withdrawn']);
export const boardTypeEnum = pgEnum('board_type', ['general', 'strategy', 'hand', 'tournament', 'beginner', 'notice']);
export const postStatusEnum = pgEnum('post_status', ['published', 'draft', 'hidden', 'deleted']);
export const commentStatusEnum = pgEnum('comment_status', ['published', 'hidden', 'deleted']);
export const tagCategoryEnum = pgEnum('tag_category', ['strategy', 'position', 'game_type', 'tournament', 'general']);
export const voteTypeEnum = pgEnum('vote_type', ['call', 'raise', 'fold', 'check']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewed', 'resolved', 'dismissed']);
export const reportTargetTypeEnum = pgEnum('report_target_type', ['post', 'comment', 'user']);
export const gameTypeEnum = pgEnum('game_type', ['nlhe', 'plo', 'plo5', 'mixed']);
export const tableSizeEnum = pgEnum('table_size', ['heads_up', '3max', '6max', '9max']);
export const positionEnum = pgEnum('position', ['btn', 'sb', 'bb', 'utg', 'utg1', 'utg2', 'mp', 'mp1', 'mp2', 'co']);
export const handResultEnum = pgEnum('hand_result', ['win', 'loss', 'tie']);
export const streetEnum = pgEnum('street', ['preflop', 'flop', 'turn', 'river']);
export const actionTypeEnum = pgEnum('action_type', ['fold', 'check', 'call', 'bet', 'raise', 'all_in']);
export const badgeCategoryEnum = pgEnum('badge_category', ['achievement', 'participation', 'skill', 'social', 'special']);
export const badgeRarityEnum = pgEnum('badge_rarity', ['common', 'rare', 'epic', 'legendary']);
export const missionTypeEnum = pgEnum('mission_type', ['daily', 'weekly', 'monthly', 'one_time']);
export const missionConditionTypeEnum = pgEnum('mission_condition_type', ['post_count', 'comment_count', 'hand_share', 'attendance', 'like_received']);
export const pointTransactionTypeEnum = pgEnum('point_transaction_type', ['earn_post', 'earn_comment', 'earn_like', 'earn_attendance', 'earn_mission', 'earn_game', 'earn_harvest', 'spend_badge', 'spend_custom_title', 'spend_game', 'admin_adjust']);
export const xpTransactionTypeEnum = pgEnum('xp_transaction_type', ['post', 'comment', 'like', 'hand_share', 'attendance', 'mission', 'admin_adjust']);
export const notificationTypeEnum = pgEnum('notification_type', ['comment', 'like', 'follow', 'mention', 'badge', 'level_up', 'system']);
export const chatRoomTypeEnum = pgEnum('chat_room_type', ['general', 'game', 'tournament', 'private']);
export const chatMessageTypeEnum = pgEnum('chat_message_type', ['text', 'image', 'system']);
export const bannerPositionEnum = pgEnum('banner_position', ['main_top', 'main_side', 'board_top', 'floating']);

// ==================== USER DOMAIN ====================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  nickname: varchar('nickname', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  bannerUrl: varchar('banner_url', { length: 500 }),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  points: integer('points').notNull().default(1000),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  customTitle: varchar('custom_title', { length: 100 }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  nicknameIdx: uniqueIndex('users_nickname_idx').on(table.nickname),
}));

export const userFollows = pgTable('user_follows', {
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followingId] }),
}));

export const userBlocks = pgTable('user_blocks', {
  blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.blockerId, table.blockedId] }),
}));

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  notifyComments: boolean('notify_comments').notNull().default(true),
  notifyLikes: boolean('notify_likes').notNull().default(true),
  notifyFollows: boolean('notify_follows').notNull().default(true),
  notifyMentions: boolean('notify_mentions').notNull().default(true),
  emailNotifications: boolean('email_notifications').notNull().default(false),
  showOnlineStatus: boolean('show_online_status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==================== CONTENT DOMAIN ====================

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  nameKo: varchar('name_ko', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  description: text('description'),
  type: boardTypeEnum('type').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  minLevelToPost: integer('min_level_to_post').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  postCount: integer('post_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('boards_slug_idx').on(table.slug),
}));

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  contentHtml: text('content_html'),
  status: postStatusEnum('status').notNull().default('published'),
  isPinned: boolean('is_pinned').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  bookmarkCount: integer('bookmark_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  boardIdIdx: index('posts_board_id_idx').on(table.boardId),
  authorIdIdx: index('posts_author_id_idx').on(table.authorId),
  createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
}));

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  likeCount: integer('like_count').notNull().default(0),
  status: commentStatusEnum('status').notNull().default('published'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  postIdIdx: index('comments_post_id_idx').on(table.postId),
  authorIdIdx: index('comments_author_id_idx').on(table.authorId),
}));

export const postLikes = pgTable('post_likes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const commentLikes = pgTable('comment_likes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.commentId] }),
}));

export const bookmarks = pgTable('bookmarks', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  nameKo: varchar('name_ko', { length: 50 }).notNull(),
  nameEn: varchar('name_en', { length: 50 }).notNull(),
  category: tagCategoryEnum('category').notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameKoIdx: index('tags_name_ko_idx').on(table.nameKo),
}));

export const postTags = pgTable('post_tags', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.tagId] }),
}));

export const strategyVotes = pgTable('strategy_votes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  vote: voteTypeEnum('vote').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: reportTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  status: reportStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  reporterIdIdx: index('reports_reporter_id_idx').on(table.reporterId),
  statusIdx: index('reports_status_idx').on(table.status),
}));

// ==================== POKER DOMAIN ====================

export const pokerHands = pgTable('poker_hands', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameType: gameTypeEnum('game_type').notNull(),
  tableSize: tableSizeEnum('table_size').notNull(),
  stakes: varchar('stakes', { length: 50 }).notNull(),
  heroPosition: positionEnum('hero_position').notNull(),
  heroCards: varchar('hero_cards', { length: 10 }).notNull(),
  boardFlop: varchar('board_flop', { length: 20 }),
  boardTurn: varchar('board_turn', { length: 5 }),
  boardRiver: varchar('board_river', { length: 5 }),
  potPreflop: integer('pot_preflop'),
  potFlop: integer('pot_flop'),
  potTurn: integer('pot_turn'),
  potRiver: integer('pot_river'),
  result: handResultEnum('result').notNull(),
  analysisNotes: text('analysis_notes'),
  rawText: text('raw_text'),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  authorIdIdx: index('poker_hands_author_id_idx').on(table.authorId),
  createdAtIdx: index('poker_hands_created_at_idx').on(table.createdAt),
}));

export const pokerHandPlayers = pgTable('poker_hand_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  handId: uuid('hand_id').notNull().references(() => pokerHands.id, { onDelete: 'cascade' }),
  position: positionEnum('position').notNull(),
  stackSize: integer('stack_size').notNull(),
  cards: varchar('cards', { length: 10 }),
  isHero: boolean('is_hero').notNull().default(false),
}, (table) => ({
  handIdIdx: index('poker_hand_players_hand_id_idx').on(table.handId),
}));

export const pokerHandActions = pgTable('poker_hand_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  handId: uuid('hand_id').notNull().references(() => pokerHands.id, { onDelete: 'cascade' }),
  street: streetEnum('street').notNull(),
  sequence: integer('sequence').notNull(),
  position: positionEnum('position').notNull(),
  action: actionTypeEnum('action').notNull(),
  amount: integer('amount'),
}, (table) => ({
  handIdIdx: index('poker_hand_actions_hand_id_idx').on(table.handId),
}));

export const pokerHandComments = pgTable('poker_hand_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  handId: uuid('hand_id').notNull().references(() => pokerHands.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  street: streetEnum('street'),
  content: text('content').notNull(),
  likeCount: integer('like_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  handIdIdx: index('poker_hand_comments_hand_id_idx').on(table.handId),
}));

export const pokerHandLikes = pgTable('poker_hand_likes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  handId: uuid('hand_id').notNull().references(() => pokerHands.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.handId] }),
}));

// ==================== GAMIFICATION DOMAIN ====================

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  nameKo: varchar('name_ko', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  descriptionKo: text('description_ko'),
  descriptionEn: text('description_en'),
  iconUrl: varchar('icon_url', { length: 500 }).notNull(),
  category: badgeCategoryEnum('category').notNull(),
  rarity: badgeRarityEnum('rarity').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('badges_slug_idx').on(table.slug),
}));

export const userBadges = pgTable('user_badges', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  isPinned: boolean('is_pinned').notNull().default(false),
  pinOrder: integer('pin_order'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.badgeId] }),
}));

export const missions = pgTable('missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: missionTypeEnum('type').notNull(),
  nameKo: varchar('name_ko', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  descriptionKo: text('description_ko'),
  descriptionEn: text('description_en'),
  conditionType: missionConditionTypeEnum('condition_type').notNull(),
  conditionTarget: integer('condition_target').notNull(),
  pointReward: integer('point_reward').notNull().default(0),
  xpReward: integer('xp_reward').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userMissions = pgTable('user_missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  missionId: uuid('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  progress: integer('progress').notNull().default(0),
  isCompleted: boolean('is_completed').notNull().default(false),
  rewardClaimed: boolean('reward_claimed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_missions_user_id_idx').on(table.userId),
}));

export const attendance = pgTable('attendance', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  checkDate: date('check_date').notNull(),
  streakCount: integer('streak_count').notNull().default(1),
  pointsEarned: integer('points_earned').notNull().default(0),
  xpEarned: integer('xp_earned').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.checkDate] }),
}));

export const userStreaks = pgTable('user_streaks', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  attendanceStreak: integer('attendance_streak').notNull().default(0),
  bestAttendanceStreak: integer('best_attendance_streak').notNull().default(0),
  postingStreak: integer('posting_streak').notNull().default(0),
  pokerWinStreak: integer('poker_win_streak').notNull().default(0),
  streakShieldCount: integer('streak_shield_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  type: pointTransactionTypeEnum('type').notNull(),
  referenceId: uuid('reference_id'),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('point_transactions_user_id_idx').on(table.userId),
  createdAtIdx: index('point_transactions_created_at_idx').on(table.createdAt),
}));

export const xpTransactions = pgTable('xp_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: xpTransactionTypeEnum('type').notNull(),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('xp_transactions_user_id_idx').on(table.userId),
}));

export const levelConfigs = pgTable('level_configs', {
  level: integer('level').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  badgeUrl: varchar('badge_url', { length: 500 }),
  minXp: integer('min_xp').notNull(),
  color: varchar('color', { length: 20 }),
});

// ==================== SOCIAL DOMAIN ====================

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body'),
  link: varchar('link', { length: 500 }),
  isRead: boolean('is_read').notNull().default(false),
  actorId: uuid('actor_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}));

export const chatRooms = pgTable('chat_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  nameKo: varchar('name_ko', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  type: chatRoomTypeEnum('type').notNull(),
  minLevel: integer('min_level').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('chat_rooms_slug_idx').on(table.slug),
}));

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id').notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: chatMessageTypeEnum('type').notNull().default('text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roomIdIdx: index('chat_messages_room_id_idx').on(table.roomId),
  createdAtIdx: index('chat_messages_created_at_idx').on(table.createdAt),
  roomCreatedAtIdx: index('chat_messages_room_created_at_idx').on(table.roomId, table.createdAt),
}));

// ==================== ADMIN DOMAIN ====================

export const banners = pgTable('banners', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  linkUrl: varchar('link_url', { length: 500 }),
  position: bannerPositionEnum('position').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminLogs = pgTable('admin_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  adminIdIdx: index('admin_logs_admin_id_idx').on(table.adminId),
  createdAtIdx: index('admin_logs_created_at_idx').on(table.createdAt),
}));

// ==================== THREADS DOMAIN ====================

// Threads (short status posts like Twitter/Instagram Threads)
export const threads = pgTable('threads', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  contentHtml: text('content_html'),
  imageUrl: varchar('image_url', { length: 500 }),
  likesCount: integer('likes_count').default(0).notNull(),
  repliesCount: integer('replies_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  authorIdIdx: index('threads_author_id_idx').on(table.authorId),
  createdAtIdx: index('threads_created_at_idx').on(table.createdAt),
}));

export const threadLikes = pgTable('thread_likes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  threadId: uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.threadId] }),
]);

export const threadReplies = pgTable('thread_replies', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  threadId: uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  threadIdIdx: index('thread_replies_thread_id_idx').on(table.threadId),
  authorIdIdx: index('thread_replies_author_id_idx').on(table.authorId),
}));

// ==================== GAMES & REWARDS DOMAIN ====================

export const cooldownRewardTypeEnum = pgEnum('cooldown_reward_type', ['point_harvest', 'daily_bonus', 'event_bonus']);

export const lotteryTierEnum = pgEnum('lottery_tier', ['first', 'second', 'third', 'fourth', 'none']);

// Cooldown-based reward claims (e.g., "포인트 수확" every 5 hours)
export const cooldownRewards = pgTable('cooldown_rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: cooldownRewardTypeEnum('type').notNull().default('point_harvest'),
  pointsEarned: integer('points_earned').notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('cooldown_rewards_user_id_idx').on(table.userId),
  claimedAtIdx: index('cooldown_rewards_claimed_at_idx').on(table.claimedAt),
  userClaimedAtIdx: index('idx_cooldown_rewards_user_claimed').on(table.userId, table.claimedAt),
}));

// Lottery ticket purchases and results
export const lotteryTickets = pgTable('lottery_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cost: integer('cost').notNull().default(100),
  tier: lotteryTierEnum('tier').notNull(),
  prizeAmount: integer('prize_amount').notNull().default(0),
  isRevealed: boolean('is_revealed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('lottery_tickets_user_id_idx').on(table.userId),
  createdAtIdx: index('lottery_tickets_created_at_idx').on(table.createdAt),
}));

// Roulette game history
export const rouletteSpins = pgTable('roulette_spins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  betAmount: integer('bet_amount').notNull(),
  multiplier: varchar('multiplier', { length: 10 }).notNull(),
  winAmount: integer('win_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('roulette_spins_user_id_idx').on(table.userId),
  createdAtIdx: index('roulette_spins_created_at_idx').on(table.createdAt),
}));

// ==================== LIVE POKER GAME DOMAIN ====================

export const pokerTableStatusEnum = pgEnum('poker_table_status', ['waiting', 'playing', 'paused', 'closed']);
export const pokerHandStatusEnum = pgEnum('poker_hand_status', ['dealing', 'preflop', 'flop', 'turn', 'river', 'showdown', 'complete']);
export const pokerActionTypeEnum = pgEnum('poker_action_type', ['fold', 'check', 'call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb']);

// Active game tables
export const pokerTables = pgTable('poker_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  smallBlind: integer('small_blind').notNull(),
  bigBlind: integer('big_blind').notNull(),
  ante: integer('ante').notNull().default(0),
  minBuyIn: integer('min_buy_in').notNull(),
  maxBuyIn: integer('max_buy_in').notNull(),
  maxSeats: integer('max_seats').notNull().default(6),
  status: pokerTableStatusEnum('status').notNull().default('waiting'),
  currentHandId: uuid('current_hand_id'),
  handCount: integer('hand_count').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('poker_tables_status_idx').on(table.status),
}));

// Players seated at tables
export const pokerTableSeats = pgTable('poker_table_seats', {
  tableId: uuid('table_id').notNull().references(() => pokerTables.id, { onDelete: 'cascade' }),
  seatNumber: integer('seat_number').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chipStack: integer('chip_stack').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  isSittingOut: boolean('is_sitting_out').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tableId, table.seatNumber] }),
  uniqueUserIdx: uniqueIndex('poker_table_seats_table_user_idx').on(table.tableId, table.userId),
  tableIdIdx: index('poker_table_seats_table_id_idx').on(table.tableId),
}));

// Individual hands dealt
export const pokerGameHands = pgTable('poker_game_hands', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull().references(() => pokerTables.id, { onDelete: 'cascade' }),
  handNumber: integer('hand_number').notNull(),
  dealerSeat: integer('dealer_seat').notNull(),
  smallBlindSeat: integer('small_blind_seat').notNull(),
  bigBlindSeat: integer('big_blind_seat').notNull(),
  communityCards: jsonb('community_cards').notNull().default('[]'),
  fullCommunityCards: jsonb('full_community_cards').notNull().default('[]'),
  potTotal: integer('pot_total').notNull().default(0),
  status: pokerHandStatusEnum('status').notNull().default('dealing'),
  currentSeat: integer('current_seat'),
  currentBet: integer('current_bet').notNull().default(0),
  minRaise: integer('min_raise').notNull().default(0),
  turnStartedAt: timestamp('turn_started_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  tableIdIdx: index('poker_game_hands_table_id_idx').on(table.tableId),
  statusIdx: index('poker_game_hands_status_idx').on(table.status),
  tableHandNumIdx: index('poker_game_hands_table_hand_num_idx').on(table.tableId, table.handNumber),
}));

// Actions taken during hands
export const pokerGameActions = pgTable('poker_game_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  handId: uuid('hand_id').notNull().references(() => pokerGameHands.id, { onDelete: 'cascade' }),
  seatNumber: integer('seat_number').notNull(),
  street: streetEnum('street').notNull(),
  actionType: pokerActionTypeEnum('action_type').notNull(),
  amount: integer('amount').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  handIdIdx: index('poker_game_actions_hand_id_idx').on(table.handId),
  handCreatedIdx: index('poker_game_actions_hand_created_idx').on(table.handId, table.createdAt),
}));

// Results for each player per hand
export const pokerGameResults = pgTable('poker_game_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  handId: uuid('hand_id').notNull().references(() => pokerGameHands.id, { onDelete: 'cascade' }),
  seatNumber: integer('seat_number').notNull(),
  holeCards: jsonb('hole_cards').notNull(),
  chipChange: integer('chip_change').notNull(),
  isWinner: boolean('is_winner').notNull().default(false),
  handRank: varchar('hand_rank', { length: 50 }),
}, (table) => ({
  handIdIdx: index('poker_game_results_hand_id_idx').on(table.handId),
}));

// ==================== NEWS DOMAIN ====================

// User bookmarks for external news articles (RSS items)
export const newsBookmarks = pgTable('news_bookmarks', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: varchar('news_id', { length: 500 }).notNull(), // RSS item ID or link used as stable identifier
  title: varchar('title', { length: 500 }).notNull(),
  link: varchar('link', { length: 1000 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.newsId] }),
  userIdIdx: index('news_bookmarks_user_id_idx').on(table.userId),
}));

// ==================== MARKET / GROUP BUY DOMAIN ====================

export const marketStatusEnum = pgEnum('market_status', ['open', 'funded', 'closed', 'cancelled']);
export const marketCategoryEnum = pgEnum('market_category', ['poker_goods', 'digital', 'group_buy', 'event']);

export const marketItems = pgTable('market_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  descriptionHtml: text('description_html'),
  category: marketCategoryEnum('category').notNull(),
  price: integer('price').notNull(), // in points
  originalPrice: integer('original_price'), // for showing discount
  imageUrl: varchar('image_url', { length: 500 }),
  status: marketStatusEnum('status').default('open').notNull(),
  // Group buy fields
  isGroupBuy: boolean('is_group_buy').default(false).notNull(),
  targetCount: integer('target_count'), // min participants for group buy
  currentCount: integer('current_count').default(0).notNull(),
  deadline: timestamp('deadline', { withTimezone: true }),
  // Stats
  viewCount: integer('view_count').default(0).notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sellerIdIdx: index('market_items_seller_id_idx').on(table.sellerId),
  statusIdx: index('market_items_status_idx').on(table.status),
  categoryIdx: index('market_items_category_idx').on(table.category),
}));

export const marketOrders = pgTable('market_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').notNull().references(() => marketItems.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: integer('total_price').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, completed, cancelled, refunded
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  itemIdIdx: index('market_orders_item_id_idx').on(table.itemId),
  buyerIdIdx: index('market_orders_buyer_id_idx').on(table.buyerId),
}));
