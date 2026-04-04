CREATE TYPE "public"."goal_display_mode" AS ENUM('percentage', 'absolute');--> statement-breakpoint
CREATE TYPE "public"."goal_metric" AS ENUM('revenue', 'profit', 'sales_count');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'expired', 'archived');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"metric" "goal_metric" NOT NULL,
	"display_mode" "goal_display_mode" NOT NULL,
	"target_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_value" numeric(12, 2),
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target_value_positive" CHECK ("goals"."target_value" > 0),
	CONSTRAINT "goals_period_end_gte_start" CHECK ("goals"."period_end" >= "goals"."period_start")
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goals_period_end_idx" ON "goals" USING btree ("period_end");--> statement-breakpoint
CREATE INDEX "goals_created_by_user_id_idx" ON "goals" USING btree ("created_by_user_id");