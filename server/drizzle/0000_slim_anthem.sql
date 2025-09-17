DO $$ BEGIN
 CREATE TYPE "binding_status" AS ENUM('pending', 'bound', 'inactive');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "contact_method" AS ENUM('line_id', 'phone', 'email');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coupon_status" AS ENUM('claimed', 'used', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" varchar(200) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(100),
	"role" varchar(50) DEFAULT 'admin',
	"status" varchar(20) DEFAULT 'active',
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_stores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"coupon_id" bigint NOT NULL,
	"store_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"image_url" varchar(500),
	"media_files" json,
	"original_price" numeric(10, 2) NOT NULL,
	"discount_price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"claimed_count" integer DEFAULT 0,
	"redeemed_count" integer DEFAULT 0,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "redemptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_coupon_id" bigint NOT NULL,
	"store_id" bigint NOT NULL,
	"verifier_id" bigint,
	"verification_method" varchar(20) DEFAULT 'qrcode',
	"redeemed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rich_menu_configs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"menu_type" varchar(20) NOT NULL,
	"menu_name" varchar(100) NOT NULL,
	"rich_menu_id" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_bindings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"preset_id" bigint NOT NULL,
	"line_user_id" varchar(50),
	"display_name" varchar(100),
	"binding_status" "binding_status" DEFAULT 'pending' NOT NULL,
	"bound_at" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_bindings_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_presets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"store_id" bigint NOT NULL,
	"staff_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"department" varchar(100),
	"position" varchar(100),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" varchar(500) NOT NULL,
	"city" varchar(100),
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"image_url" varchar(500),
	"code" varchar(50),
	"google_place_id" varchar(200),
	"rating" numeric(3, 2),
	"opening_hours" text,
	"phone" varchar(50),
	"website" varchar(500),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_coupons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"coupon_id" bigint NOT NULL,
	"redemption_code" char(6) NOT NULL,
	"qr_code_data" text NOT NULL,
	"status" "coupon_status" DEFAULT 'claimed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"redeemed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "user_coupons_redemption_code_unique" UNIQUE("redemption_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"line_id" varchar(100) NOT NULL,
	"nickname" varchar(100),
	"avatar" varchar(500),
	"is_following" boolean DEFAULT false,
	"language" varchar(10) DEFAULT 'zh-cn',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_line_id_unique" UNIQUE("line_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"store_id" bigint NOT NULL,
	"contact_method" "contact_method" DEFAULT 'line_id' NOT NULL,
	"line_id" varchar(100),
	"phone" varchar(50),
	"email" varchar(200),
	"name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rich_menu_configs_menu_type_unique" ON "rich_menu_configs" ("menu_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_store_staff_id" ON "staff_presets" ("store_id","staff_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_stores" ADD CONSTRAINT "coupon_stores_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_stores" ADD CONSTRAINT "coupon_stores_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_coupon_id_user_coupons_id_fk" FOREIGN KEY ("user_coupon_id") REFERENCES "user_coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_bindings" ADD CONSTRAINT "staff_bindings_preset_id_staff_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "staff_presets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_presets" ADD CONSTRAINT "staff_presets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verifiers" ADD CONSTRAINT "verifiers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
