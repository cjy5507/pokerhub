CREATE TYPE "public"."baccarat_bet_zone" AS ENUM('player', 'banker', 'tie', 'player_pair', 'banker_pair');--> statement-breakpoint
CREATE TYPE "public"."baccarat_status" AS ENUM('betting', 'dealing', 'result', 'paused');--> statement-breakpoint
CREATE TABLE "baccarat_bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"zone" "baccarat_bet_zone" NOT NULL,
	"amount" integer NOT NULL,
	"round_id" varchar(50) NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baccarat_rounds" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"table_id" uuid NOT NULL,
	"player_cards" jsonb,
	"banker_cards" jsonb,
	"player_score" integer,
	"banker_score" integer,
	"result" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baccarat_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "baccarat_status" DEFAULT 'betting' NOT NULL,
	"phase_ends_at" timestamp with time zone,
	"history" jsonb DEFAULT '[]',
	"current_round_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "market_orders_item_id_idx";--> statement-breakpoint
ALTER TABLE "poker_tables" ADD COLUMN "ante" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "baccarat_bets" ADD CONSTRAINT "baccarat_bets_table_id_baccarat_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."baccarat_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baccarat_bets" ADD CONSTRAINT "baccarat_bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baccarat_rounds" ADD CONSTRAINT "baccarat_rounds_table_id_baccarat_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."baccarat_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baccarat_bets_table_id_idx" ON "baccarat_bets" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "baccarat_bets_user_id_idx" ON "baccarat_bets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "baccarat_bets_unresolved_idx" ON "baccarat_bets" USING btree ("table_id","is_resolved");--> statement-breakpoint
CREATE INDEX "chat_messages_room_created_at_idx" ON "chat_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_cooldown_rewards_user_claimed" ON "cooldown_rewards" USING btree ("user_id","claimed_at");--> statement-breakpoint
CREATE INDEX "thread_replies_thread_id_idx" ON "thread_replies" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "thread_replies_author_id_idx" ON "thread_replies" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "threads_author_id_idx" ON "threads" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "threads_created_at_idx" ON "threads" USING btree ("created_at");