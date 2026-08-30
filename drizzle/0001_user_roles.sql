CREATE TYPE "public"."role" AS ENUM('guest', 'host', 'moderator', 'admin');--> statement-breakpoint
DROP INDEX "users_external_auth_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roles" "role"[] DEFAULT '{"guest"}' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_external_auth_idx" ON "users" USING btree ("tenant_id","external_auth_id");