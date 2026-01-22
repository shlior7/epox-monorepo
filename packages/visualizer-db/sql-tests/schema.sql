CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "admin_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"admin_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_session_token_unique" UNIQUE("token")
);

CREATE TABLE "admin_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_user_email_unique" UNIQUE("email")
);

CREATE TABLE "ai_cost_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"request_id" text,
	"job_id" text,
	"operation_type" text NOT NULL,
	"model" text NOT NULL,
	"provider" text DEFAULT 'google-gemini' NOT NULL,
	"cost_usd_cents" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"image_count" integer,
	"video_duration_seconds" integer,
	"metadata" jsonb,
	"success" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_session" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"selected_base_image_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "client" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"metadata" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_slug_unique" UNIQUE("slug")
);

CREATE TABLE "collection_session" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_base_images" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "favorite_image" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"generated_asset_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "generated_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"generation_flow_id" text,
	"chat_session_id" text,
	"asset_url" text NOT NULL,
	"asset_type" text DEFAULT 'image' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"prompt" text,
	"settings" jsonb,
	"product_ids" jsonb,
	"job_id" text,
	"error" text,
	"asset_analysis" jsonb,
	"analysis_version" text,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"approved_by" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"deleted_at" timestamp
);

CREATE TABLE "generated_asset_product" (
	"id" text PRIMARY KEY NOT NULL,
	"generated_asset_id" text NOT NULL,
	"product_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "generation_event" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"generation_flow_id" text,
	"product_id" text,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "generation_flow" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_session_id" text,
	"client_id" text NOT NULL,
	"name" text,
	"product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_base_images" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'empty' NOT NULL,
	"settings" jsonb NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"current_image_index" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "generation_flow_product" (
	"id" text PRIMARY KEY NOT NULL,
	"generation_flow_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generation_flow_product_unique" UNIQUE("generation_flow_id","product_id")
);

CREATE TABLE "generation_job" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"flow_id" text,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);

CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_session_id" text,
	"collection_session_id" text,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"base_image_ids" jsonb,
	"inspiration_image_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_session_check" CHECK ((chat_session_id IS NOT NULL AND collection_session_id IS NULL) OR (chat_session_id IS NULL AND collection_session_id IS NOT NULL))
);

CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"scene_types" jsonb,
	"model_filename" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'uploaded' NOT NULL,
	"store_connection_id" text,
	"erp_id" text,
	"erp_sku" text,
	"erp_url" text,
	"imported_at" timestamp,
	"analysis_data" jsonb,
	"analysis_version" text,
	"analyzed_at" timestamp,
	"price" numeric(10, 2),
	"metadata" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "product_image" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"r2_key_base" text NOT NULL,
	"r2_key_preview" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quota_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"monthly_generation_limit" integer DEFAULT 100 NOT NULL,
	"storage_quota_mb" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quota_limit_client_id_unique" UNIQUE("client_id")
);

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"active_client_id" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "store_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"store_type" text NOT NULL,
	"store_url" text NOT NULL,
	"store_name" text,
	"credentials_ciphertext" text NOT NULL,
	"credentials_iv" text NOT NULL,
	"credentials_tag" text NOT NULL,
	"credentials_key_id" text NOT NULL,
	"credentials_fingerprint" text,
	"token_expires_at" timestamp,
	"auto_sync_enabled" boolean DEFAULT false NOT NULL,
	"sync_on_approval" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_connection_unique" UNIQUE("client_id","store_type","store_url")
);

CREATE TABLE "store_sync_log" (
	"id" text PRIMARY KEY NOT NULL,
	"store_connection_id" text NOT NULL,
	"generated_asset_id" text NOT NULL,
	"product_id" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"external_image_url" text,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);

CREATE TABLE "usage_record" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"month" text NOT NULL,
	"generation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"default_generation_settings" jsonb,
	"notification_settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_admin_user_id_admin_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "collection_session" ADD CONSTRAINT "collection_session_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "favorite_image" ADD CONSTRAINT "favorite_image_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "favorite_image" ADD CONSTRAINT "favorite_image_generated_asset_id_generated_asset_id_fk" FOREIGN KEY ("generated_asset_id") REFERENCES "public"."generated_asset"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generated_asset" ADD CONSTRAINT "generated_asset_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generated_asset" ADD CONSTRAINT "generated_asset_generation_flow_id_generation_flow_id_fk" FOREIGN KEY ("generation_flow_id") REFERENCES "public"."generation_flow"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "generated_asset" ADD CONSTRAINT "generated_asset_chat_session_id_chat_session_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_session"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "generated_asset" ADD CONSTRAINT "generated_asset_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "generated_asset_product" ADD CONSTRAINT "gen_asset_prod_asset_fk" FOREIGN KEY ("generated_asset_id") REFERENCES "public"."generated_asset"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generated_asset_product" ADD CONSTRAINT "gen_asset_prod_product_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_event" ADD CONSTRAINT "generation_event_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_event" ADD CONSTRAINT "generation_event_generation_flow_id_generation_flow_id_fk" FOREIGN KEY ("generation_flow_id") REFERENCES "public"."generation_flow"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "generation_event" ADD CONSTRAINT "generation_event_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "generation_flow" ADD CONSTRAINT "generation_flow_collection_session_id_collection_session_id_fk" FOREIGN KEY ("collection_session_id") REFERENCES "public"."collection_session"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_flow" ADD CONSTRAINT "generation_flow_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_flow_product" ADD CONSTRAINT "gen_flow_prod_flow_fk" FOREIGN KEY ("generation_flow_id") REFERENCES "public"."generation_flow"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_flow_product" ADD CONSTRAINT "gen_flow_prod_product_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_flow_id_generation_flow_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."generation_flow"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "member" ADD CONSTRAINT "member_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "message" ADD CONSTRAINT "message_chat_session_id_chat_session_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_session"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "message" ADD CONSTRAINT "message_collection_session_id_collection_session_id_fk" FOREIGN KEY ("collection_session_id") REFERENCES "public"."collection_session"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product" ADD CONSTRAINT "product_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quota_limit" ADD CONSTRAINT "quota_limit_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "store_connection" ADD CONSTRAINT "store_connection_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "store_sync_log" ADD CONSTRAINT "store_sync_log_store_connection_id_store_connection_id_fk" FOREIGN KEY ("store_connection_id") REFERENCES "public"."store_connection"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "store_sync_log" ADD CONSTRAINT "store_sync_log_generated_asset_id_generated_asset_id_fk" FOREIGN KEY ("generated_asset_id") REFERENCES "public"."generated_asset"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "store_sync_log" ADD CONSTRAINT "store_sync_log_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");
CREATE INDEX "admin_session_admin_user_id_idx" ON "admin_session" USING btree ("admin_user_id");
CREATE INDEX "ai_cost_tracking_client_created_idx" ON "ai_cost_tracking" USING btree ("client_id","created_at");
CREATE INDEX "ai_cost_tracking_user_created_idx" ON "ai_cost_tracking" USING btree ("user_id","created_at");
CREATE INDEX "ai_cost_tracking_request_id_idx" ON "ai_cost_tracking" USING btree ("request_id");
CREATE INDEX "ai_cost_tracking_job_id_idx" ON "ai_cost_tracking" USING btree ("job_id");
CREATE INDEX "chat_session_product_id_idx" ON "chat_session" USING btree ("product_id");
CREATE UNIQUE INDEX "client_slug_idx" ON "client" USING btree ("slug");
CREATE INDEX "collection_session_client_id_idx" ON "collection_session" USING btree ("client_id");
CREATE INDEX "favorite_image_client_id_idx" ON "favorite_image" USING btree ("client_id");
CREATE INDEX "favorite_image_generated_asset_id_idx" ON "favorite_image" USING btree ("generated_asset_id");
CREATE INDEX "generated_asset_client_id_idx" ON "generated_asset" USING btree ("client_id","created_at");
CREATE INDEX "generated_asset_generation_flow_id_idx" ON "generated_asset" USING btree ("generation_flow_id","created_at");
CREATE INDEX "generated_asset_chat_session_id_idx" ON "generated_asset" USING btree ("chat_session_id","created_at");
CREATE INDEX "generated_asset_created_at_idx" ON "generated_asset" USING btree ("created_at");
CREATE INDEX "generated_asset_job_id_idx" ON "generated_asset" USING btree ("job_id");
CREATE INDEX "generated_asset_status_idx" ON "generated_asset" USING btree ("status");
CREATE INDEX "generated_asset_approval_status_idx" ON "generated_asset" USING btree ("client_id","approval_status");
CREATE INDEX "generated_asset_deleted_at_idx" ON "generated_asset" USING btree ("deleted_at");
CREATE INDEX "generated_asset_pinned_idx" ON "generated_asset" USING btree ("client_id","pinned");
CREATE INDEX "generated_asset_product_asset_idx" ON "generated_asset_product" USING btree ("generated_asset_id");
CREATE INDEX "generated_asset_product_product_idx" ON "generated_asset_product" USING btree ("product_id");
CREATE INDEX "generation_event_client_id_idx" ON "generation_event" USING btree ("client_id");
CREATE INDEX "generation_event_type_idx" ON "generation_event" USING btree ("event_type");
CREATE INDEX "generation_event_created_at_idx" ON "generation_event" USING btree ("created_at");
CREATE INDEX "generation_event_flow_id_idx" ON "generation_event" USING btree ("generation_flow_id");
CREATE INDEX "generation_flow_collection_session_id_idx" ON "generation_flow" USING btree ("collection_session_id","created_at");
CREATE INDEX "generation_flow_client_id_idx" ON "generation_flow" USING btree ("client_id");
CREATE INDEX "generation_flow_status_idx" ON "generation_flow" USING btree ("status");
CREATE INDEX "generation_flow_favorite_idx" ON "generation_flow" USING btree ("client_id","is_favorite");
CREATE INDEX "generation_flow_product_flow_idx" ON "generation_flow_product" USING btree ("generation_flow_id");
CREATE INDEX "generation_flow_product_product_idx" ON "generation_flow_product" USING btree ("product_id");
CREATE INDEX "idx_generation_job_claimable" ON "generation_job" USING btree ("priority","created_at");
CREATE INDEX "idx_generation_job_flow" ON "generation_job" USING btree ("flow_id");
CREATE INDEX "idx_generation_job_client" ON "generation_job" USING btree ("client_id","created_at");
CREATE INDEX "idx_generation_job_status" ON "generation_job" USING btree ("status");
CREATE INDEX "invitation_client_id_idx" ON "invitation" USING btree ("client_id");
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");
CREATE UNIQUE INDEX "member_client_user_idx" ON "member" USING btree ("client_id","user_id");
CREATE INDEX "member_client_id_idx" ON "member" USING btree ("client_id");
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");
CREATE INDEX "message_chat_session_id_idx" ON "message" USING btree ("chat_session_id");
CREATE INDEX "message_collection_session_id_idx" ON "message" USING btree ("collection_session_id");
CREATE INDEX "product_client_id_idx" ON "product" USING btree ("client_id");
CREATE INDEX "product_favorite_idx" ON "product" USING btree ("client_id","is_favorite");
CREATE INDEX "product_source_idx" ON "product" USING btree ("client_id","source");
CREATE INDEX "product_erp_idx" ON "product" USING btree ("store_connection_id","erp_id");
CREATE INDEX "product_analyzed_idx" ON "product" USING btree ("client_id","analyzed_at");
CREATE INDEX "product_image_product_id_idx" ON "product_image" USING btree ("product_id");
CREATE INDEX "product_image_sort_order_idx" ON "product_image" USING btree ("product_id","sort_order");
CREATE INDEX "product_image_primary_idx" ON "product_image" USING btree ("product_id","is_primary");
CREATE INDEX "quota_limit_client_id_idx" ON "quota_limit" USING btree ("client_id");
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");
CREATE INDEX "session_active_client_id_idx" ON "session" USING btree ("active_client_id");
CREATE INDEX "store_connection_client_id_idx" ON "store_connection" USING btree ("client_id");
CREATE INDEX "store_sync_log_store_connection_id_idx" ON "store_sync_log" USING btree ("store_connection_id");
CREATE INDEX "store_sync_log_generated_asset_id_idx" ON "store_sync_log" USING btree ("generated_asset_id");
CREATE INDEX "store_sync_log_product_id_idx" ON "store_sync_log" USING btree ("product_id");
CREATE INDEX "store_sync_log_status_idx" ON "store_sync_log" USING btree ("status");
CREATE UNIQUE INDEX "usage_record_client_month_idx" ON "usage_record" USING btree ("client_id","month");
CREATE INDEX "usage_record_user_month_idx" ON "usage_record" USING btree ("user_id","month");
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");