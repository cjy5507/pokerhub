CREATE INDEX IF NOT EXISTS "baccarat_bets_round_unresolved_idx" ON "baccarat_bets" USING btree ("round_id","is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "baccarat_bets_round_user_resolved_idx" ON "baccarat_bets" USING btree ("round_id","user_id","is_resolved");
