import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_cms"."enum_steps_media_type" AS ENUM('art', 'films', 'albums', 'books');
  ALTER TABLE "payload_cms"."steps" ADD COLUMN "media_type" "payload_cms"."enum_steps_media_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_cms"."steps" DROP COLUMN "media_type";
  DROP TYPE "payload_cms"."enum_steps_media_type";`)
}
