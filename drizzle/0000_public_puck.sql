CREATE TYPE "public"."action_type" AS ENUM('fold', 'check', 'call', 'bet', 'raise', 'all_in');--> statement-breakpoint
CREATE TYPE "public"."badge_category" AS ENUM('achievement', 'participation', 'skill', 'social', 'special');--> statement-breakpoint
CREATE TYPE "public"."badge_rarity" AS ENUM('common', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."banner_position" AS ENUM('main_top', 'main_side', 'board_top', 'floating');--> statement-breakpoint
CREATE TYPE "public"."board_type" AS ENUM('general', 'strategy', 'hand', 'tournament', 'beginner', 'notice');--> statement-breakpoint
CREATE TYPE "public"."chat_message_type" AS ENUM('text', 'image', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_room_type" AS ENUM('general', 'game', 'tournament', 'private');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('published', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."cooldown_reward_type" AS ENUM('point_harvest', 'daily_bonus', 'event_bonus');--> statement-breakpoint
CREATE TYPE "public"."game_type" AS ENUM('nlhe', 'plo', 'plo5', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."hand_result" AS ENUM('win', 'loss', 'tie');--> statement-breakpoint
CREATE TYPE "public"."lottery_tier" AS ENUM('first', 'second', 'third', 'fourth', 'none');--> statement-breakpoint
CREATE TYPE "public"."market_category" AS ENUM('poker_goods', 'digital', 'group_buy', 'event');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('open', 'funded', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."mission_condition_type" AS ENUM('post_count', 'comment_count', 'hand_share', 'attendance', 'like_received');--> statement-breakpoint
CREATE TYPE "public"."mission_type" AS ENUM('daily', 'weekly', 'monthly', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('comment', 'like', 'follow', 'mention', 'badge', 'level_up', 'system');--> statement-breakpoint
CREATE TYPE "public"."point_transaction_type" AS ENUM('earn_post', 'earn_comment', 'earn_like', 'earn_attendance', 'earn_mission', 'earn_game', 'earn_harvest', 'spend_badge', 'spend_custom_title', 'spend_game', 'admin_adjust');--> statement-breakpoint
CREATE TYPE "public"."poker_action_type" AS ENUM('fold', 'check', 'call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb');--> statement-breakpoint
CREATE TYPE "public"."poker_hand_status" AS ENUM('dealing', 'preflop', 'flop', 'turn', 'river', 'showdown', 'complete');--> statement-breakpoint
CREATE TYPE "public"."poker_table_status" AS ENUM('waiting', 'playing', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."position" AS ENUM('btn', 'sb', 'bb', 'utg', 'utg1', 'utg2', 'mp', 'mp1', 'mp2', 'co');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('published', 'draft', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('post', 'comment', 'user');--> statement-breakpoint
CREATE TYPE "public"."street" AS ENUM('preflop', 'flop', 'turn', 'river');--> statement-breakpoint
CREATE TYPE "public"."table_size" AS ENUM('heads_up', '3max', '6max', '9max');--> statement-breakpoint
CREATE TYPE "public"."tag_category" AS ENUM('strategy', 'position', 'game_type', 'tournament', 'general');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'banned', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('call', 'raise', 'fold', 'check');--> statement-breakpoint
CREATE TYPE "public"."xp_transaction_type" AS ENUM('post', 'comment', 'like', 'hand_share', 'attendance', 'mission', 'admin_adjust');--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"user_id" uuid NOT NULL,
	"check_date" date NOT NULL,
	"streak_count" integer DEFAULT 1 NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_user_id_check_date_pk" PRIMARY KEY("user_id","check_date")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name_ko" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"description_ko" text,
	"description_en" text,
	"icon_url" varchar(500) NOT NULL,
	"category" "badge_category" NOT NULL,
	"rarity" "badge_rarity" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"link_url" varchar(500),
	"position" "banner_position" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name_ko" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"description" text,
	"type" "board_type" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"min_level_to_post" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"type" "chat_message_type" DEFAULT 'text' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name_ko" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"type" "chat_room_type" NOT NULL,
	"min_level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_rooms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"user_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"status" "comment_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cooldown_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "cooldown_reward_type" DEFAULT 'point_harvest' NOT NULL,
	"points_earned" integer NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_configs" (
	"level" integer PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"badge_url" varchar(500),
	"min_xp" integer NOT NULL,
	"color" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "lottery_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cost" integer DEFAULT 100 NOT NULL,
	"tier" "lottery_tier" NOT NULL,
	"prize_amount" integer DEFAULT 0 NOT NULL,
	"is_revealed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"description_html" text,
	"category" "market_category" NOT NULL,
	"price" integer NOT NULL,
	"original_price" integer,
	"image_url" varchar(500),
	"status" "market_status" DEFAULT 'open' NOT NULL,
	"is_group_buy" boolean DEFAULT false NOT NULL,
	"target_count" integer,
	"current_count" integer DEFAULT 0 NOT NULL,
	"deadline" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_price" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "mission_type" NOT NULL,
	"name_ko" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"description_ko" text,
	"description_en" text,
	"condition_type" "mission_condition_type" NOT NULL,
	"condition_target" integer NOT NULL,
	"point_reward" integer DEFAULT 0 NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_bookmarks" (
	"user_id" uuid NOT NULL,
	"news_id" varchar(500) NOT NULL,
	"title" varchar(500) NOT NULL,
	"link" varchar(1000) NOT NULL,
	"source" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_bookmarks_user_id_news_id_pk" PRIMARY KEY("user_id","news_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"link" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"type" "point_transaction_type" NOT NULL,
	"reference_id" uuid,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poker_game_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" uuid NOT NULL,
	"seat_number" integer NOT NULL,
	"street" "street" NOT NULL,
	"action_type" "poker_action_type" NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poker_game_hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"hand_number" integer NOT NULL,
	"dealer_seat" integer NOT NULL,
	"small_blind_seat" integer NOT NULL,
	"big_blind_seat" integer NOT NULL,
	"community_cards" jsonb DEFAULT '[]' NOT NULL,
	"full_community_cards" jsonb DEFAULT '[]' NOT NULL,
	"pot_total" integer DEFAULT 0 NOT NULL,
	"status" "poker_hand_status" DEFAULT 'dealing' NOT NULL,
	"current_seat" integer,
	"current_bet" integer DEFAULT 0 NOT NULL,
	"min_raise" integer DEFAULT 0 NOT NULL,
	"turn_started_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "poker_game_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" uuid NOT NULL,
	"seat_number" integer NOT NULL,
	"hole_cards" jsonb NOT NULL,
	"chip_change" integer NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"hand_rank" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "poker_hand_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" uuid NOT NULL,
	"street" "street" NOT NULL,
	"sequence" integer NOT NULL,
	"position" "position" NOT NULL,
	"action" "action_type" NOT NULL,
	"amount" integer
);
--> statement-breakpoint
CREATE TABLE "poker_hand_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"street" "street",
	"content" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poker_hand_likes" (
	"user_id" uuid NOT NULL,
	"hand_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poker_hand_likes_user_id_hand_id_pk" PRIMARY KEY("user_id","hand_id")
);
--> statement-breakpoint
CREATE TABLE "poker_hand_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" uuid NOT NULL,
	"position" "position" NOT NULL,
	"stack_size" integer NOT NULL,
	"cards" varchar(10),
	"is_hero" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poker_hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"game_type" "game_type" NOT NULL,
	"table_size" "table_size" NOT NULL,
	"stakes" varchar(50) NOT NULL,
	"hero_position" "position" NOT NULL,
	"hero_cards" varchar(10) NOT NULL,
	"board_flop" varchar(20),
	"board_turn" varchar(5),
	"board_river" varchar(5),
	"pot_preflop" integer,
	"pot_flop" integer,
	"pot_turn" integer,
	"pot_river" integer,
	"result" "hand_result" NOT NULL,
	"analysis_notes" text,
	"raw_text" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poker_table_seats" (
	"table_id" uuid NOT NULL,
	"seat_number" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"chip_stack" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sitting_out" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poker_table_seats_table_id_seat_number_pk" PRIMARY KEY("table_id","seat_number")
);
--> statement-breakpoint
CREATE TABLE "poker_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"small_blind" integer NOT NULL,
	"big_blind" integer NOT NULL,
	"min_buy_in" integer NOT NULL,
	"max_buy_in" integer NOT NULL,
	"max_seats" integer DEFAULT 6 NOT NULL,
	"status" "poker_table_status" DEFAULT 'waiting' NOT NULL,
	"current_hand_id" uuid,
	"hand_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"status" "post_status" DEFAULT 'published' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"bookmark_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roulette_spins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bet_amount" integer NOT NULL,
	"multiplier" varchar(10) NOT NULL,
	"win_amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_votes" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"vote" "vote_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strategy_votes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ko" varchar(50) NOT NULL,
	"name_en" varchar(50) NOT NULL,
	"category" "tag_category" NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_likes" (
	"user_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_likes_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "thread_replies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"image_url" varchar(500),
	"likes_count" integer DEFAULT 0 NOT NULL,
	"replies_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"pin_order" integer,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "user_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"reward_claimed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"notify_comments" boolean DEFAULT true NOT NULL,
	"notify_likes" boolean DEFAULT true NOT NULL,
	"notify_follows" boolean DEFAULT true NOT NULL,
	"notify_mentions" boolean DEFAULT true NOT NULL,
	"email_notifications" boolean DEFAULT false NOT NULL,
	"show_online_status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"attendance_streak" integer DEFAULT 0 NOT NULL,
	"best_attendance_streak" integer DEFAULT 0 NOT NULL,
	"posting_streak" integer DEFAULT 0 NOT NULL,
	"poker_win_streak" integer DEFAULT 0 NOT NULL,
	"streak_shield_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20),
	"email" varchar(255) NOT NULL,
	"nickname" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"bio" text,
	"avatar_url" varchar(500),
	"banner_url" varchar(500),
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 1000 NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"custom_title" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" "xp_transaction_type" NOT NULL,
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooldown_rewards" ADD CONSTRAINT "cooldown_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lottery_tickets" ADD CONSTRAINT "lottery_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_items" ADD CONSTRAINT "market_items_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_item_id_market_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."market_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_bookmarks" ADD CONSTRAINT "news_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_game_actions" ADD CONSTRAINT "poker_game_actions_hand_id_poker_game_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."poker_game_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_game_hands" ADD CONSTRAINT "poker_game_hands_table_id_poker_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."poker_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_game_results" ADD CONSTRAINT "poker_game_results_hand_id_poker_game_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."poker_game_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hand_actions" ADD CONSTRAINT "poker_hand_actions_hand_id_poker_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."poker_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hand_comments" ADD CONSTRAINT "poker_hand_comments_hand_id_poker_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."poker_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hand_comments" ADD CONSTRAINT "poker_hand_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hand_likes" ADD CONSTRAINT "poker_hand_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hand_likes" ADD CONSTRAINT "poker_hand_likes_hand_id_poker_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."poker_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hand_players" ADD CONSTRAINT "poker_hand_players_hand_id_poker_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."poker_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_hands" ADD CONSTRAINT "poker_hands_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_table_seats" ADD CONSTRAINT "poker_table_seats_table_id_poker_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."poker_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_table_seats" ADD CONSTRAINT "poker_table_seats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roulette_spins" ADD CONSTRAINT "roulette_spins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_votes" ADD CONSTRAINT "strategy_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_votes" ADD CONSTRAINT "strategy_votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_likes" ADD CONSTRAINT "thread_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_likes" ADD CONSTRAINT "thread_likes_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "badges_slug_idx" ON "badges" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "boards_slug_idx" ON "boards" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "chat_messages_room_id_idx" ON "chat_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_rooms_slug_idx" ON "chat_rooms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "comments_post_id_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_author_id_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "cooldown_rewards_user_id_idx" ON "cooldown_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cooldown_rewards_claimed_at_idx" ON "cooldown_rewards" USING btree ("claimed_at");--> statement-breakpoint
CREATE INDEX "lottery_tickets_user_id_idx" ON "lottery_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lottery_tickets_created_at_idx" ON "lottery_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "market_items_seller_id_idx" ON "market_items" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "market_items_status_idx" ON "market_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "market_items_category_idx" ON "market_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "market_orders_item_id_idx" ON "market_orders" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "market_orders_buyer_id_idx" ON "market_orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "news_bookmarks_user_id_idx" ON "news_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "point_transactions_user_id_idx" ON "point_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "point_transactions_created_at_idx" ON "point_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "poker_game_actions_hand_id_idx" ON "poker_game_actions" USING btree ("hand_id");--> statement-breakpoint
CREATE INDEX "poker_game_actions_hand_created_idx" ON "poker_game_actions" USING btree ("hand_id","created_at");--> statement-breakpoint
CREATE INDEX "poker_game_hands_table_id_idx" ON "poker_game_hands" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "poker_game_hands_status_idx" ON "poker_game_hands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "poker_game_hands_table_hand_num_idx" ON "poker_game_hands" USING btree ("table_id","hand_number");--> statement-breakpoint
CREATE INDEX "poker_game_results_hand_id_idx" ON "poker_game_results" USING btree ("hand_id");--> statement-breakpoint
CREATE INDEX "poker_hand_actions_hand_id_idx" ON "poker_hand_actions" USING btree ("hand_id");--> statement-breakpoint
CREATE INDEX "poker_hand_comments_hand_id_idx" ON "poker_hand_comments" USING btree ("hand_id");--> statement-breakpoint
CREATE INDEX "poker_hand_players_hand_id_idx" ON "poker_hand_players" USING btree ("hand_id");--> statement-breakpoint
CREATE INDEX "poker_hands_author_id_idx" ON "poker_hands" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "poker_hands_created_at_idx" ON "poker_hands" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "poker_table_seats_table_user_idx" ON "poker_table_seats" USING btree ("table_id","user_id");--> statement-breakpoint
CREATE INDEX "poker_table_seats_table_id_idx" ON "poker_table_seats" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "poker_tables_status_idx" ON "poker_tables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_board_id_idx" ON "posts" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_reporter_id_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "roulette_spins_user_id_idx" ON "roulette_spins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "roulette_spins_created_at_idx" ON "roulette_spins" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tags_name_ko_idx" ON "tags" USING btree ("name_ko");--> statement-breakpoint
CREATE INDEX "user_missions_user_id_idx" ON "user_missions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_nickname_idx" ON "users" USING btree ("nickname");--> statement-breakpoint
CREATE INDEX "xp_transactions_user_id_idx" ON "xp_transactions" USING btree ("user_id");