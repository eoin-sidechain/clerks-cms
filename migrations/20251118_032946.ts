import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_cms"."enum_steps_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload_cms"."enum__steps_v_version_step_type" AS ENUM('question', 'statement');
  CREATE TYPE "payload_cms"."enum__steps_v_version_question_type" AS ENUM('short_text', 'long_text', 'multiple_choice', 'this_or_that', 'rating', 'ranking');
  CREATE TYPE "payload_cms"."enum__steps_v_version_media_type" AS ENUM('art', 'films', 'albums', 'books');
  CREATE TYPE "payload_cms"."enum__steps_v_version_statement_type" AS ENUM('text', 'video', 'audio');
  CREATE TYPE "payload_cms"."enum__steps_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload_cms"."enum_sections_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload_cms"."enum__sections_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload_cms"."_steps_v_version_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload_cms"."_steps_v_version_rating_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload_cms"."_steps_v_version_ranking_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload_cms"."_steps_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_step_type" "payload_cms"."enum__steps_v_version_step_type",
  	"version_question_type" "payload_cms"."enum__steps_v_version_question_type",
  	"version_media_type" "payload_cms"."enum__steps_v_version_media_type",
  	"version_statement_type" "payload_cms"."enum__steps_v_version_statement_type",
  	"version_text_content" jsonb,
  	"version_thumbnail_id" integer,
  	"version_media_file_id" integer,
  	"version_cta_text" varchar,
  	"version_cta_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload_cms"."enum__steps_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload_cms"."_steps_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"art_id" integer,
  	"films_id" integer,
  	"albums_id" integer,
  	"books_id" integer
  );
  
  CREATE TABLE "payload_cms"."_sections_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"step_id" integer,
  	"order" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload_cms"."_sections_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload_cms"."enum__sections_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_cms"."steps" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "payload_cms"."steps" ALTER COLUMN "step_type" DROP NOT NULL;
  ALTER TABLE "payload_cms"."sections_steps" ALTER COLUMN "step_id" DROP NOT NULL;
  ALTER TABLE "payload_cms"."sections_steps" ALTER COLUMN "order" DROP NOT NULL;
  ALTER TABLE "payload_cms"."sections" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "payload_cms"."sections" ALTER COLUMN "order" DROP NOT NULL;
  ALTER TABLE "payload_cms"."steps" ADD COLUMN "_status" "payload_cms"."enum_steps_status" DEFAULT 'draft';
  ALTER TABLE "payload_cms"."sections" ADD COLUMN "_status" "payload_cms"."enum_sections_status" DEFAULT 'draft';
  ALTER TABLE "payload_cms"."_steps_v_version_options" ADD CONSTRAINT "_steps_v_version_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_version_rating_labels" ADD CONSTRAINT "_steps_v_version_rating_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_version_ranking_options" ADD CONSTRAINT "_steps_v_version_ranking_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v" ADD CONSTRAINT "_steps_v_parent_id_steps_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."steps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v" ADD CONSTRAINT "_steps_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v" ADD CONSTRAINT "_steps_v_version_media_file_id_media_id_fk" FOREIGN KEY ("version_media_file_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_rels" ADD CONSTRAINT "_steps_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_rels" ADD CONSTRAINT "_steps_v_rels_art_fk" FOREIGN KEY ("art_id") REFERENCES "payload_cms"."art"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_rels" ADD CONSTRAINT "_steps_v_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "payload_cms"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_rels" ADD CONSTRAINT "_steps_v_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "payload_cms"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_steps_v_rels" ADD CONSTRAINT "_steps_v_rels_books_fk" FOREIGN KEY ("books_id") REFERENCES "payload_cms"."books"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_sections_v_version_steps" ADD CONSTRAINT "_sections_v_version_steps_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "payload_cms"."steps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."_sections_v_version_steps" ADD CONSTRAINT "_sections_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."_sections_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_sections_v" ADD CONSTRAINT "_sections_v_parent_id_sections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."sections"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_steps_v_version_options_order_idx" ON "payload_cms"."_steps_v_version_options" USING btree ("_order");
  CREATE INDEX "_steps_v_version_options_parent_id_idx" ON "payload_cms"."_steps_v_version_options" USING btree ("_parent_id");
  CREATE INDEX "_steps_v_version_rating_labels_order_idx" ON "payload_cms"."_steps_v_version_rating_labels" USING btree ("_order");
  CREATE INDEX "_steps_v_version_rating_labels_parent_id_idx" ON "payload_cms"."_steps_v_version_rating_labels" USING btree ("_parent_id");
  CREATE INDEX "_steps_v_version_ranking_options_order_idx" ON "payload_cms"."_steps_v_version_ranking_options" USING btree ("_order");
  CREATE INDEX "_steps_v_version_ranking_options_parent_id_idx" ON "payload_cms"."_steps_v_version_ranking_options" USING btree ("_parent_id");
  CREATE INDEX "_steps_v_parent_idx" ON "payload_cms"."_steps_v" USING btree ("parent_id");
  CREATE INDEX "_steps_v_version_version_thumbnail_idx" ON "payload_cms"."_steps_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_steps_v_version_version_media_file_idx" ON "payload_cms"."_steps_v" USING btree ("version_media_file_id");
  CREATE INDEX "_steps_v_version_version_updated_at_idx" ON "payload_cms"."_steps_v" USING btree ("version_updated_at");
  CREATE INDEX "_steps_v_version_version_created_at_idx" ON "payload_cms"."_steps_v" USING btree ("version_created_at");
  CREATE INDEX "_steps_v_version_version__status_idx" ON "payload_cms"."_steps_v" USING btree ("version__status");
  CREATE INDEX "_steps_v_created_at_idx" ON "payload_cms"."_steps_v" USING btree ("created_at");
  CREATE INDEX "_steps_v_updated_at_idx" ON "payload_cms"."_steps_v" USING btree ("updated_at");
  CREATE INDEX "_steps_v_latest_idx" ON "payload_cms"."_steps_v" USING btree ("latest");
  CREATE INDEX "_steps_v_rels_order_idx" ON "payload_cms"."_steps_v_rels" USING btree ("order");
  CREATE INDEX "_steps_v_rels_parent_idx" ON "payload_cms"."_steps_v_rels" USING btree ("parent_id");
  CREATE INDEX "_steps_v_rels_path_idx" ON "payload_cms"."_steps_v_rels" USING btree ("path");
  CREATE INDEX "_steps_v_rels_art_id_idx" ON "payload_cms"."_steps_v_rels" USING btree ("art_id");
  CREATE INDEX "_steps_v_rels_films_id_idx" ON "payload_cms"."_steps_v_rels" USING btree ("films_id");
  CREATE INDEX "_steps_v_rels_albums_id_idx" ON "payload_cms"."_steps_v_rels" USING btree ("albums_id");
  CREATE INDEX "_steps_v_rels_books_id_idx" ON "payload_cms"."_steps_v_rels" USING btree ("books_id");
  CREATE INDEX "_sections_v_version_steps_order_idx" ON "payload_cms"."_sections_v_version_steps" USING btree ("_order");
  CREATE INDEX "_sections_v_version_steps_parent_id_idx" ON "payload_cms"."_sections_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_sections_v_version_steps_step_idx" ON "payload_cms"."_sections_v_version_steps" USING btree ("step_id");
  CREATE INDEX "_sections_v_parent_idx" ON "payload_cms"."_sections_v" USING btree ("parent_id");
  CREATE INDEX "_sections_v_version_version_updated_at_idx" ON "payload_cms"."_sections_v" USING btree ("version_updated_at");
  CREATE INDEX "_sections_v_version_version_created_at_idx" ON "payload_cms"."_sections_v" USING btree ("version_created_at");
  CREATE INDEX "_sections_v_version_version__status_idx" ON "payload_cms"."_sections_v" USING btree ("version__status");
  CREATE INDEX "_sections_v_created_at_idx" ON "payload_cms"."_sections_v" USING btree ("created_at");
  CREATE INDEX "_sections_v_updated_at_idx" ON "payload_cms"."_sections_v" USING btree ("updated_at");
  CREATE INDEX "_sections_v_latest_idx" ON "payload_cms"."_sections_v" USING btree ("latest");
  CREATE INDEX "steps__status_idx" ON "payload_cms"."steps" USING btree ("_status");
  CREATE INDEX "sections__status_idx" ON "payload_cms"."sections" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_cms"."_steps_v_version_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_cms"."_steps_v_version_rating_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_cms"."_steps_v_version_ranking_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_cms"."_steps_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_cms"."_steps_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_cms"."_sections_v_version_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_cms"."_sections_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload_cms"."_steps_v_version_options" CASCADE;
  DROP TABLE "payload_cms"."_steps_v_version_rating_labels" CASCADE;
  DROP TABLE "payload_cms"."_steps_v_version_ranking_options" CASCADE;
  DROP TABLE "payload_cms"."_steps_v" CASCADE;
  DROP TABLE "payload_cms"."_steps_v_rels" CASCADE;
  DROP TABLE "payload_cms"."_sections_v_version_steps" CASCADE;
  DROP TABLE "payload_cms"."_sections_v" CASCADE;
  DROP INDEX "payload_cms"."steps__status_idx";
  DROP INDEX "payload_cms"."sections__status_idx";
  ALTER TABLE "payload_cms"."steps" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "payload_cms"."steps" ALTER COLUMN "step_type" SET NOT NULL;
  ALTER TABLE "payload_cms"."sections_steps" ALTER COLUMN "step_id" SET NOT NULL;
  ALTER TABLE "payload_cms"."sections_steps" ALTER COLUMN "order" SET NOT NULL;
  ALTER TABLE "payload_cms"."sections" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "payload_cms"."sections" ALTER COLUMN "order" SET NOT NULL;
  ALTER TABLE "payload_cms"."steps" DROP COLUMN "_status";
  ALTER TABLE "payload_cms"."sections" DROP COLUMN "_status";
  DROP TYPE "payload_cms"."enum_steps_status";
  DROP TYPE "payload_cms"."enum__steps_v_version_step_type";
  DROP TYPE "payload_cms"."enum__steps_v_version_question_type";
  DROP TYPE "payload_cms"."enum__steps_v_version_media_type";
  DROP TYPE "payload_cms"."enum__steps_v_version_statement_type";
  DROP TYPE "payload_cms"."enum__steps_v_version_status";
  DROP TYPE "payload_cms"."enum_sections_status";
  DROP TYPE "payload_cms"."enum__sections_v_version_status";`)
}
