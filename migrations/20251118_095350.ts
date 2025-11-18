import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_cms"."steps" ADD COLUMN "description" varchar;
  ALTER TABLE "payload_cms"."_steps_v" ADD COLUMN "version_description" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_cms"."steps" DROP COLUMN "description";
  ALTER TABLE "payload_cms"."_steps_v" DROP COLUMN "version_description";`)
}
