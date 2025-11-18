import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_cms"."enum_steps_step_type" AS ENUM('question', 'statement');
  CREATE TYPE "payload_cms"."enum_steps_question_type" AS ENUM('short_text', 'long_text', 'multiple_choice', 'this_or_that', 'rating', 'ranking');
  CREATE TYPE "payload_cms"."enum_steps_category" AS ENUM('general_info', 'inner_self', 'music_questions', 'film_questions', 'literature_questions');
  CREATE TYPE "payload_cms"."enum_steps_statement_type" AS ENUM('text', 'video', 'audio');
  CREATE TABLE "payload_cms"."steps_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "payload_cms"."steps_rating_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric
  );
  
  CREATE TABLE "payload_cms"."steps_ranking_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload_cms"."steps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"step_type" "payload_cms"."enum_steps_step_type" NOT NULL,
  	"question_type" "payload_cms"."enum_steps_question_type",
  	"category" "payload_cms"."enum_steps_category",
  	"statement_type" "payload_cms"."enum_steps_statement_type",
  	"text_content" jsonb,
  	"thumbnail_id" integer,
  	"media_file_id" integer,
  	"cta_text" varchar,
  	"cta_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."steps_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"art_id" integer,
  	"films_id" integer,
  	"albums_id" integer,
  	"books_id" integer
  );
  
  CREATE TABLE "payload_cms"."sections_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step_id" integer NOT NULL,
  	"order" numeric NOT NULL
  );
  
  ALTER TABLE IF EXISTS "payload_cms"."questions_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."questions_rating_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."questions_ranking_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."questions_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."sections_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."sections_statements" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "payload_cms"."questions_options" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."questions_rating_labels" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."questions_ranking_options" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."questions" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."questions_rels" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."sections_questions" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."sections_statements" CASCADE;
  ALTER TABLE IF EXISTS "payload_cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_questions_fk";

  DROP INDEX IF EXISTS "payload_cms"."payload_locked_documents_rels_questions_id_idx";
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD COLUMN "steps_id" integer;
  ALTER TABLE "payload_cms"."steps_options" ADD CONSTRAINT "steps_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_rating_labels" ADD CONSTRAINT "steps_rating_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_ranking_options" ADD CONSTRAINT "steps_ranking_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps" ADD CONSTRAINT "steps_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps" ADD CONSTRAINT "steps_media_file_id_media_id_fk" FOREIGN KEY ("media_file_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_rels" ADD CONSTRAINT "steps_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_rels" ADD CONSTRAINT "steps_rels_art_fk" FOREIGN KEY ("art_id") REFERENCES "payload_cms"."art"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_rels" ADD CONSTRAINT "steps_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "payload_cms"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_rels" ADD CONSTRAINT "steps_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "payload_cms"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."steps_rels" ADD CONSTRAINT "steps_rels_books_fk" FOREIGN KEY ("books_id") REFERENCES "payload_cms"."books"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_steps" ADD CONSTRAINT "sections_steps_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "payload_cms"."steps"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_steps" ADD CONSTRAINT "sections_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."sections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "steps_options_order_idx" ON "payload_cms"."steps_options" USING btree ("_order");
  CREATE INDEX "steps_options_parent_id_idx" ON "payload_cms"."steps_options" USING btree ("_parent_id");
  CREATE INDEX "steps_rating_labels_order_idx" ON "payload_cms"."steps_rating_labels" USING btree ("_order");
  CREATE INDEX "steps_rating_labels_parent_id_idx" ON "payload_cms"."steps_rating_labels" USING btree ("_parent_id");
  CREATE INDEX "steps_ranking_options_order_idx" ON "payload_cms"."steps_ranking_options" USING btree ("_order");
  CREATE INDEX "steps_ranking_options_parent_id_idx" ON "payload_cms"."steps_ranking_options" USING btree ("_parent_id");
  CREATE INDEX "steps_thumbnail_idx" ON "payload_cms"."steps" USING btree ("thumbnail_id");
  CREATE INDEX "steps_media_file_idx" ON "payload_cms"."steps" USING btree ("media_file_id");
  CREATE INDEX "steps_updated_at_idx" ON "payload_cms"."steps" USING btree ("updated_at");
  CREATE INDEX "steps_created_at_idx" ON "payload_cms"."steps" USING btree ("created_at");
  CREATE INDEX "steps_rels_order_idx" ON "payload_cms"."steps_rels" USING btree ("order");
  CREATE INDEX "steps_rels_parent_idx" ON "payload_cms"."steps_rels" USING btree ("parent_id");
  CREATE INDEX "steps_rels_path_idx" ON "payload_cms"."steps_rels" USING btree ("path");
  CREATE INDEX "steps_rels_art_id_idx" ON "payload_cms"."steps_rels" USING btree ("art_id");
  CREATE INDEX "steps_rels_films_id_idx" ON "payload_cms"."steps_rels" USING btree ("films_id");
  CREATE INDEX "steps_rels_albums_id_idx" ON "payload_cms"."steps_rels" USING btree ("albums_id");
  CREATE INDEX "steps_rels_books_id_idx" ON "payload_cms"."steps_rels" USING btree ("books_id");
  CREATE INDEX "sections_steps_order_idx" ON "payload_cms"."sections_steps" USING btree ("_order");
  CREATE INDEX "sections_steps_parent_id_idx" ON "payload_cms"."sections_steps" USING btree ("_parent_id");
  CREATE INDEX "sections_steps_step_idx" ON "payload_cms"."sections_steps" USING btree ("step_id");
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_steps_fk" FOREIGN KEY ("steps_id") REFERENCES "payload_cms"."steps"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_steps_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("steps_id");
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" DROP COLUMN IF EXISTS "questions_id";
  DROP TYPE IF EXISTS "payload_cms"."enum_questions_question_type";
  DROP TYPE IF EXISTS "payload_cms"."enum_questions_category";
  DROP TYPE IF EXISTS "payload_cms"."enum_sections_statements_statement_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_cms"."enum_questions_question_type" AS ENUM('short_text', 'long_text', 'multiple_choice', 'this_or_that', 'rating', 'ranking');
  CREATE TYPE "payload_cms"."enum_questions_category" AS ENUM('general_info', 'inner_self', 'music_questions', 'film_questions', 'literature_questions');
  CREATE TYPE "payload_cms"."enum_sections_statements_statement_type" AS ENUM('text', 'video', 'audio');
  CREATE TABLE "payload_cms"."questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "payload_cms"."questions_rating_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric
  );
  
  CREATE TABLE "payload_cms"."questions_ranking_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload_cms"."questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question_text" varchar NOT NULL,
  	"question_type" "payload_cms"."enum_questions_question_type" NOT NULL,
  	"category" "payload_cms"."enum_questions_category" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."questions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"art_id" integer,
  	"films_id" integer,
  	"albums_id" integer,
  	"books_id" integer
  );
  
  CREATE TABLE "payload_cms"."sections_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" integer NOT NULL,
  	"order" numeric NOT NULL
  );
  
  CREATE TABLE "payload_cms"."sections_statements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" numeric NOT NULL,
  	"title" varchar,
  	"statement_type" "payload_cms"."enum_sections_statements_statement_type" NOT NULL,
  	"text_content" jsonb,
  	"thumbnail_id" integer,
  	"media_file_id" integer,
  	"cta_text" varchar,
  	"cta_url" varchar
  );
  
  ALTER TABLE IF EXISTS "payload_cms"."steps_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."steps_rating_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."steps_ranking_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."steps_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "payload_cms"."sections_steps" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "payload_cms"."steps_options" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."steps_rating_labels" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."steps_ranking_options" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."steps" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."steps_rels" CASCADE;
  DROP TABLE IF EXISTS "payload_cms"."sections_steps" CASCADE;
  ALTER TABLE IF EXISTS "payload_cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_steps_fk";

  DROP INDEX IF EXISTS "payload_cms"."payload_locked_documents_rels_steps_id_idx";
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD COLUMN "questions_id" integer;
  ALTER TABLE "payload_cms"."questions_options" ADD CONSTRAINT "questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_rating_labels" ADD CONSTRAINT "questions_rating_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_ranking_options" ADD CONSTRAINT "questions_ranking_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_rels" ADD CONSTRAINT "questions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_rels" ADD CONSTRAINT "questions_rels_art_fk" FOREIGN KEY ("art_id") REFERENCES "payload_cms"."art"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_rels" ADD CONSTRAINT "questions_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "payload_cms"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_rels" ADD CONSTRAINT "questions_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "payload_cms"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."questions_rels" ADD CONSTRAINT "questions_rels_books_fk" FOREIGN KEY ("books_id") REFERENCES "payload_cms"."books"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_questions" ADD CONSTRAINT "sections_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "payload_cms"."questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_questions" ADD CONSTRAINT "sections_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_statements" ADD CONSTRAINT "sections_statements_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_statements" ADD CONSTRAINT "sections_statements_media_file_id_media_id_fk" FOREIGN KEY ("media_file_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."sections_statements" ADD CONSTRAINT "sections_statements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."sections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "questions_options_order_idx" ON "payload_cms"."questions_options" USING btree ("_order");
  CREATE INDEX "questions_options_parent_id_idx" ON "payload_cms"."questions_options" USING btree ("_parent_id");
  CREATE INDEX "questions_rating_labels_order_idx" ON "payload_cms"."questions_rating_labels" USING btree ("_order");
  CREATE INDEX "questions_rating_labels_parent_id_idx" ON "payload_cms"."questions_rating_labels" USING btree ("_parent_id");
  CREATE INDEX "questions_ranking_options_order_idx" ON "payload_cms"."questions_ranking_options" USING btree ("_order");
  CREATE INDEX "questions_ranking_options_parent_id_idx" ON "payload_cms"."questions_ranking_options" USING btree ("_parent_id");
  CREATE INDEX "questions_updated_at_idx" ON "payload_cms"."questions" USING btree ("updated_at");
  CREATE INDEX "questions_created_at_idx" ON "payload_cms"."questions" USING btree ("created_at");
  CREATE INDEX "questions_rels_order_idx" ON "payload_cms"."questions_rels" USING btree ("order");
  CREATE INDEX "questions_rels_parent_idx" ON "payload_cms"."questions_rels" USING btree ("parent_id");
  CREATE INDEX "questions_rels_path_idx" ON "payload_cms"."questions_rels" USING btree ("path");
  CREATE INDEX "questions_rels_art_id_idx" ON "payload_cms"."questions_rels" USING btree ("art_id");
  CREATE INDEX "questions_rels_films_id_idx" ON "payload_cms"."questions_rels" USING btree ("films_id");
  CREATE INDEX "questions_rels_albums_id_idx" ON "payload_cms"."questions_rels" USING btree ("albums_id");
  CREATE INDEX "questions_rels_books_id_idx" ON "payload_cms"."questions_rels" USING btree ("books_id");
  CREATE INDEX "sections_questions_order_idx" ON "payload_cms"."sections_questions" USING btree ("_order");
  CREATE INDEX "sections_questions_parent_id_idx" ON "payload_cms"."sections_questions" USING btree ("_parent_id");
  CREATE INDEX "sections_questions_question_idx" ON "payload_cms"."sections_questions" USING btree ("question_id");
  CREATE INDEX "sections_statements_order_idx" ON "payload_cms"."sections_statements" USING btree ("_order");
  CREATE INDEX "sections_statements_parent_id_idx" ON "payload_cms"."sections_statements" USING btree ("_parent_id");
  CREATE INDEX "sections_statements_thumbnail_idx" ON "payload_cms"."sections_statements" USING btree ("thumbnail_id");
  CREATE INDEX "sections_statements_media_file_idx" ON "payload_cms"."sections_statements" USING btree ("media_file_id");
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "payload_cms"."questions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_questions_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("questions_id");
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" DROP COLUMN IF EXISTS "steps_id";
  DROP TYPE IF EXISTS "payload_cms"."enum_steps_step_type";
  DROP TYPE IF EXISTS "payload_cms"."enum_steps_question_type";
  DROP TYPE IF EXISTS "payload_cms"."enum_steps_category";
  DROP TYPE IF EXISTS "payload_cms"."enum_steps_statement_type";`)
}
