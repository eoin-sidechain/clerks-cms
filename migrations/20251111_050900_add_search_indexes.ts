import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE INDEX "films_title_idx" ON "payload_cms"."films" USING btree ("title");
  CREATE INDEX "films_director_idx" ON "payload_cms"."films" USING btree ("director");
  CREATE INDEX "films_description_idx" ON "payload_cms"."films" USING btree ("description");
  CREATE INDEX "albums_title_idx" ON "payload_cms"."albums" USING btree ("title");
  CREATE INDEX "albums_artist_idx" ON "payload_cms"."albums" USING btree ("artist");
  CREATE INDEX "albums_description_idx" ON "payload_cms"."albums" USING btree ("description");
  CREATE INDEX "books_title_idx" ON "payload_cms"."books" USING btree ("title");
  CREATE INDEX "books_author_idx" ON "payload_cms"."books" USING btree ("author");
  CREATE INDEX "books_description_idx" ON "payload_cms"."books" USING btree ("description");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload_cms"."films_title_idx";
  DROP INDEX "payload_cms"."films_director_idx";
  DROP INDEX "payload_cms"."films_description_idx";
  DROP INDEX "payload_cms"."albums_title_idx";
  DROP INDEX "payload_cms"."albums_artist_idx";
  DROP INDEX "payload_cms"."albums_description_idx";
  DROP INDEX "payload_cms"."books_title_idx";
  DROP INDEX "payload_cms"."books_author_idx";
  DROP INDEX "payload_cms"."books_description_idx";`)
}
