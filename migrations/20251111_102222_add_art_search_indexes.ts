import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE INDEX "art_title_idx" ON "payload_cms"."art" USING btree ("title");
  CREATE INDEX "art_artist_idx" ON "payload_cms"."art" USING btree ("artist");
  CREATE INDEX "art_description_idx" ON "payload_cms"."art" USING btree ("description");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload_cms"."art_title_idx";
  DROP INDEX "payload_cms"."art_artist_idx";
  DROP INDEX "payload_cms"."art_description_idx";`)
}
