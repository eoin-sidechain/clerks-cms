import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_cms"."enum_questions_question_type" AS ENUM('short_text', 'long_text', 'multiple_choice', 'this_or_that', 'rating', 'ranking');
  CREATE TYPE "payload_cms"."enum_questions_category" AS ENUM('general_info', 'inner_self', 'music_questions', 'film_questions', 'literature_questions');
  CREATE TYPE "payload_cms"."enum_sections_statements_statement_type" AS ENUM('text', 'video', 'audio');
  CREATE TYPE "payload_cms"."enum_applications_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload_cms"."enum__applications_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload_cms"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload_cms"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_cms"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_square_url" varchar,
  	"sizes_square_width" numeric,
  	"sizes_square_height" numeric,
  	"sizes_square_mime_type" varchar,
  	"sizes_square_filesize" numeric,
  	"sizes_square_filename" varchar,
  	"sizes_small_url" varchar,
  	"sizes_small_width" numeric,
  	"sizes_small_height" numeric,
  	"sizes_small_mime_type" varchar,
  	"sizes_small_filesize" numeric,
  	"sizes_small_filename" varchar,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_xlarge_url" varchar,
  	"sizes_xlarge_width" numeric,
  	"sizes_xlarge_height" numeric,
  	"sizes_xlarge_mime_type" varchar,
  	"sizes_xlarge_filesize" numeric,
  	"sizes_xlarge_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "payload_cms"."art" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"artist" varchar NOT NULL,
  	"cover_image_id" integer NOT NULL,
  	"year" numeric,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."films" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"director" varchar NOT NULL,
  	"cover_image_id" integer NOT NULL,
  	"year" numeric,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."albums" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"artist" varchar NOT NULL,
  	"cover_image_id" integer NOT NULL,
  	"year" numeric,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."books" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"author" varchar NOT NULL,
  	"cover_image_id" integer NOT NULL,
  	"year" numeric,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  
  CREATE TABLE "payload_cms"."sections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"order" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload_cms"."enum_applications_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload_cms"."applications_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sections_id" integer
  );
  
  CREATE TABLE "payload_cms"."_applications_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_published" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload_cms"."enum__applications_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload_cms"."_applications_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sections_id" integer
  );
  
  CREATE TABLE "payload_cms"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"art_id" integer,
  	"films_id" integer,
  	"albums_id" integer,
  	"books_id" integer,
  	"questions_id" integer,
  	"sections_id" integer,
  	"applications_id" integer
  );
  
  CREATE TABLE "payload_cms"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_cms"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_cms"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_cms"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."art" ADD CONSTRAINT "art_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."films" ADD CONSTRAINT "films_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."albums" ADD CONSTRAINT "albums_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."books" ADD CONSTRAINT "books_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload_cms"."media"("id") ON DELETE set null ON UPDATE no action;
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
  ALTER TABLE "payload_cms"."applications_rels" ADD CONSTRAINT "applications_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."applications_rels" ADD CONSTRAINT "applications_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "payload_cms"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_applications_v" ADD CONSTRAINT "_applications_v_parent_id_applications_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_cms"."_applications_v_rels" ADD CONSTRAINT "_applications_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."_applications_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."_applications_v_rels" ADD CONSTRAINT "_applications_v_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "payload_cms"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload_cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload_cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_art_fk" FOREIGN KEY ("art_id") REFERENCES "payload_cms"."art"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "payload_cms"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "payload_cms"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_books_fk" FOREIGN KEY ("books_id") REFERENCES "payload_cms"."books"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "payload_cms"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "payload_cms"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_applications_fk" FOREIGN KEY ("applications_id") REFERENCES "payload_cms"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_cms"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload_cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "payload_cms"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload_cms"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload_cms"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload_cms"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload_cms"."users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "payload_cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload_cms"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload_cms"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload_cms"."media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_square_sizes_square_filename_idx" ON "payload_cms"."media" USING btree ("sizes_square_filename");
  CREATE INDEX "media_sizes_small_sizes_small_filename_idx" ON "payload_cms"."media" USING btree ("sizes_small_filename");
  CREATE INDEX "media_sizes_medium_sizes_medium_filename_idx" ON "payload_cms"."media" USING btree ("sizes_medium_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "payload_cms"."media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_xlarge_sizes_xlarge_filename_idx" ON "payload_cms"."media" USING btree ("sizes_xlarge_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "payload_cms"."media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "art_slug_idx" ON "payload_cms"."art" USING btree ("slug");
  CREATE INDEX "art_cover_image_idx" ON "payload_cms"."art" USING btree ("cover_image_id");
  CREATE INDEX "art_updated_at_idx" ON "payload_cms"."art" USING btree ("updated_at");
  CREATE INDEX "art_created_at_idx" ON "payload_cms"."art" USING btree ("created_at");
  CREATE UNIQUE INDEX "films_slug_idx" ON "payload_cms"."films" USING btree ("slug");
  CREATE INDEX "films_cover_image_idx" ON "payload_cms"."films" USING btree ("cover_image_id");
  CREATE INDEX "films_updated_at_idx" ON "payload_cms"."films" USING btree ("updated_at");
  CREATE INDEX "films_created_at_idx" ON "payload_cms"."films" USING btree ("created_at");
  CREATE UNIQUE INDEX "albums_slug_idx" ON "payload_cms"."albums" USING btree ("slug");
  CREATE INDEX "albums_cover_image_idx" ON "payload_cms"."albums" USING btree ("cover_image_id");
  CREATE INDEX "albums_updated_at_idx" ON "payload_cms"."albums" USING btree ("updated_at");
  CREATE INDEX "albums_created_at_idx" ON "payload_cms"."albums" USING btree ("created_at");
  CREATE UNIQUE INDEX "books_slug_idx" ON "payload_cms"."books" USING btree ("slug");
  CREATE INDEX "books_cover_image_idx" ON "payload_cms"."books" USING btree ("cover_image_id");
  CREATE INDEX "books_updated_at_idx" ON "payload_cms"."books" USING btree ("updated_at");
  CREATE INDEX "books_created_at_idx" ON "payload_cms"."books" USING btree ("created_at");
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
  CREATE INDEX "sections_updated_at_idx" ON "payload_cms"."sections" USING btree ("updated_at");
  CREATE INDEX "sections_created_at_idx" ON "payload_cms"."sections" USING btree ("created_at");
  CREATE UNIQUE INDEX "applications_slug_idx" ON "payload_cms"."applications" USING btree ("slug");
  CREATE INDEX "applications_updated_at_idx" ON "payload_cms"."applications" USING btree ("updated_at");
  CREATE INDEX "applications_created_at_idx" ON "payload_cms"."applications" USING btree ("created_at");
  CREATE INDEX "applications__status_idx" ON "payload_cms"."applications" USING btree ("_status");
  CREATE INDEX "applications_rels_order_idx" ON "payload_cms"."applications_rels" USING btree ("order");
  CREATE INDEX "applications_rels_parent_idx" ON "payload_cms"."applications_rels" USING btree ("parent_id");
  CREATE INDEX "applications_rels_path_idx" ON "payload_cms"."applications_rels" USING btree ("path");
  CREATE INDEX "applications_rels_sections_id_idx" ON "payload_cms"."applications_rels" USING btree ("sections_id");
  CREATE INDEX "_applications_v_parent_idx" ON "payload_cms"."_applications_v" USING btree ("parent_id");
  CREATE INDEX "_applications_v_version_version_slug_idx" ON "payload_cms"."_applications_v" USING btree ("version_slug");
  CREATE INDEX "_applications_v_version_version_updated_at_idx" ON "payload_cms"."_applications_v" USING btree ("version_updated_at");
  CREATE INDEX "_applications_v_version_version_created_at_idx" ON "payload_cms"."_applications_v" USING btree ("version_created_at");
  CREATE INDEX "_applications_v_version_version__status_idx" ON "payload_cms"."_applications_v" USING btree ("version__status");
  CREATE INDEX "_applications_v_created_at_idx" ON "payload_cms"."_applications_v" USING btree ("created_at");
  CREATE INDEX "_applications_v_updated_at_idx" ON "payload_cms"."_applications_v" USING btree ("updated_at");
  CREATE INDEX "_applications_v_latest_idx" ON "payload_cms"."_applications_v" USING btree ("latest");
  CREATE INDEX "_applications_v_rels_order_idx" ON "payload_cms"."_applications_v_rels" USING btree ("order");
  CREATE INDEX "_applications_v_rels_parent_idx" ON "payload_cms"."_applications_v_rels" USING btree ("parent_id");
  CREATE INDEX "_applications_v_rels_path_idx" ON "payload_cms"."_applications_v_rels" USING btree ("path");
  CREATE INDEX "_applications_v_rels_sections_id_idx" ON "payload_cms"."_applications_v_rels" USING btree ("sections_id");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_cms"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_cms"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_cms"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_art_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("art_id");
  CREATE INDEX "payload_locked_documents_rels_films_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("films_id");
  CREATE INDEX "payload_locked_documents_rels_albums_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("albums_id");
  CREATE INDEX "payload_locked_documents_rels_books_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("books_id");
  CREATE INDEX "payload_locked_documents_rels_questions_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("questions_id");
  CREATE INDEX "payload_locked_documents_rels_sections_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("sections_id");
  CREATE INDEX "payload_locked_documents_rels_applications_id_idx" ON "payload_cms"."payload_locked_documents_rels" USING btree ("applications_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_cms"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_cms"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_cms"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_cms"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_cms"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_cms"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_cms"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_cms"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_cms"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload_cms"."users_sessions" CASCADE;
  DROP TABLE "payload_cms"."users" CASCADE;
  DROP TABLE "payload_cms"."media" CASCADE;
  DROP TABLE "payload_cms"."art" CASCADE;
  DROP TABLE "payload_cms"."films" CASCADE;
  DROP TABLE "payload_cms"."albums" CASCADE;
  DROP TABLE "payload_cms"."books" CASCADE;
  DROP TABLE "payload_cms"."questions_options" CASCADE;
  DROP TABLE "payload_cms"."questions_rating_labels" CASCADE;
  DROP TABLE "payload_cms"."questions_ranking_options" CASCADE;
  DROP TABLE "payload_cms"."questions" CASCADE;
  DROP TABLE "payload_cms"."questions_rels" CASCADE;
  DROP TABLE "payload_cms"."sections_questions" CASCADE;
  DROP TABLE "payload_cms"."sections_statements" CASCADE;
  DROP TABLE "payload_cms"."sections" CASCADE;
  DROP TABLE "payload_cms"."applications" CASCADE;
  DROP TABLE "payload_cms"."applications_rels" CASCADE;
  DROP TABLE "payload_cms"."_applications_v" CASCADE;
  DROP TABLE "payload_cms"."_applications_v_rels" CASCADE;
  DROP TABLE "payload_cms"."payload_locked_documents" CASCADE;
  DROP TABLE "payload_cms"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_cms"."payload_preferences" CASCADE;
  DROP TABLE "payload_cms"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload_cms"."payload_migrations" CASCADE;
  DROP TYPE "payload_cms"."enum_questions_question_type";
  DROP TYPE "payload_cms"."enum_questions_category";
  DROP TYPE "payload_cms"."enum_sections_statements_statement_type";
  DROP TYPE "payload_cms"."enum_applications_status";
  DROP TYPE "payload_cms"."enum__applications_v_version_status";`)
}
