CREATE TYPE "public"."booking_mode" AS ENUM('one_to_one', 'private_group', 'crowdshared');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'disputed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."cancelled_by" AS ENUM('guest', 'host', 'platform');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode" AS ENUM('remote', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."display_name_style" AS ENUM('first_name', 'first_name_last_initial', 'nickname', 'stage_name');--> statement-breakpoint
CREATE TYPE "public"."experience_category" AS ENUM('storytelling', 'comedy', 'music', 'magic', 'cooking', 'dance', 'art', 'improv', 'games', 'dj', 'craft');--> statement-breakpoint
CREATE TYPE "public"."experience_status" AS ENUM('draft', 'published', 'paused');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('submitted', 'triaged', 'investigating', 'resolved', 'dismissed', 'appealed');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_status" AS ENUM('pending', 'released', 'held', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('guest_charge', 'host_guaranteed_compensation', 'performance_bonus', 'platform_fee', 'processing_allocation', 'tip', 'refund', 'cancellation_compensation', 'dispute_hold', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'warned', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."occurrence_status" AS ENUM('scheduled', 'sold_out', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('harassment', 'sexual_or_inappropriate', 'hate_or_threats', 'intoxication_or_disruptive', 'unauthorized_recording', 'materially_different_from_listing', 'off_platform_transaction_attempt', 'technical_failure', 'other_safety');--> statement-breakpoint
CREATE TYPE "public"."risk_signal_kind" AS ENUM('off_platform_contact', 'off_platform_payment', 'repeat_circumvention', 'repeated_cancellations', 'multiple_reports');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'failed');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"experience_id" text NOT NULL,
	"occurrence_id" text,
	"guest_user_id" text NOT NULL,
	"booking_mode" "booking_mode" NOT NULL,
	"delivery_mode" "delivery_mode" DEFAULT 'remote' NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"total_price_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"booking_code" text NOT NULL,
	"policies_accepted_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" "cancelled_by",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"participant_user_ids" text[] NOT NULL,
	"booking_ref" text,
	"clear_violations" integer DEFAULT 0 NOT NULL,
	"ambiguous_signals" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"host_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"category" "experience_category" NOT NULL,
	"secondary_categories" text[] DEFAULT '{}' NOT NULL,
	"booking_modes" "booking_mode"[] NOT NULL,
	"delivery_modes" "delivery_mode"[] NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_one_to_one_minor" bigint,
	"price_group_minor" bigint,
	"price_per_seat_minor" bigint,
	"currency" text DEFAULT 'USD' NOT NULL,
	"samples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover" jsonb NOT NULL,
	"what_to_expect" text[] DEFAULT '{}' NOT NULL,
	"minimum_age" integer,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"intents" text[] DEFAULT '{}' NOT NULL,
	"status" "experience_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"approximate_region" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"sessions_hosted" integer DEFAULT 0 NOT NULL,
	"average_rating" real,
	"review_count" integer DEFAULT 0 NOT NULL,
	"on_time_rate" integer,
	"responds_within" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"booking_id" text,
	"session_id" text,
	"reporter_user_id" text NOT NULL,
	"reported_user_id" text,
	"category" "report_category" NOT NULL,
	"severity" "incident_severity" DEFAULT 'low' NOT NULL,
	"status" "incident_status" DEFAULT 'submitted' NOT NULL,
	"description" text NOT NULL,
	"review_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "ledger_entry_status" DEFAULT 'pending' NOT NULL,
	"payee_user_id" text,
	"memo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'sent' NOT NULL,
	"moderation" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"experience_id" text NOT NULL,
	"host_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"timezone" text NOT NULL,
	"booking_mode" "booking_mode" NOT NULL,
	"delivery_mode" "delivery_mode" DEFAULT 'remote' NOT NULL,
	"capacity" integer NOT NULL,
	"seats_booked" integer DEFAULT 0 NOT NULL,
	"price_per_seat_minor" bigint,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "occurrence_status" DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"experience_id" text NOT NULL,
	"host_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"public_comment" text,
	"structured" jsonb NOT NULL,
	"private_notes" text,
	"tip_minor" bigint,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" "risk_signal_kind" NOT NULL,
	"confidence" integer NOT NULL,
	"context" text NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"occurrence_id" text,
	"guest_display_name" text NOT NULL,
	"booking_code" text NOT NULL,
	"price_paid_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"legal_first_name" text NOT NULL,
	"legal_last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"payout_account_ref" text,
	"address_line" text,
	"government_id_ref" text,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_provider" text,
	"display_name" text NOT NULL,
	"display_style" "display_name_style" NOT NULL,
	"handle" text NOT NULL,
	"avatar_src" text,
	"avatar_alt" text,
	"external_auth_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_host_id_host_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."host_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD CONSTRAINT "host_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_tenant_code_idx" ON "bookings" USING btree ("tenant_id","booking_code");--> statement-breakpoint
CREATE INDEX "bookings_tenant_guest_idx" ON "bookings" USING btree ("tenant_id","guest_user_id");--> statement-breakpoint
CREATE INDEX "bookings_tenant_occurrence_idx" ON "bookings" USING btree ("tenant_id","occurrence_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiences_tenant_slug_idx" ON "experiences" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "experiences_tenant_status_idx" ON "experiences" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "experiences_tenant_category_idx" ON "experiences" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "experiences_tenant_host_idx" ON "experiences" USING btree ("tenant_id","host_id");--> statement-breakpoint
CREATE INDEX "host_profiles_tenant_user_idx" ON "host_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "incidents_tenant_status_idx" ON "incidents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "incidents_tenant_created_idx" ON "incidents" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_tenant_booking_idx" ON "ledger_entries" USING btree ("tenant_id","booking_id");--> statement-breakpoint
CREATE INDEX "ledger_tenant_payee_idx" ON "ledger_entries" USING btree ("tenant_id","payee_user_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_conversation_idx" ON "messages" USING btree ("tenant_id","conversation_id");--> statement-breakpoint
CREATE INDEX "occurrences_tenant_start_idx" ON "occurrences" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "occurrences_tenant_experience_idx" ON "occurrences" USING btree ("tenant_id","experience_id");--> statement-breakpoint
CREATE INDEX "reviews_tenant_experience_idx" ON "reviews" USING btree ("tenant_id","experience_id");--> statement-breakpoint
CREATE INDEX "reviews_tenant_host_idx" ON "reviews" USING btree ("tenant_id","host_id");--> statement-breakpoint
CREATE INDEX "risk_signals_tenant_user_idx" ON "risk_signals" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "seats_tenant_booking_idx" ON "seats" USING btree ("tenant_id","booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_handle_idx" ON "users" USING btree ("tenant_id","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "users_external_auth_idx" ON "users" USING btree ("tenant_id","external_auth_id");