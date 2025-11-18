import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_cms"."steps" ADD COLUMN "subtitle" varchar;
  ALTER TABLE "payload_cms"."steps" ADD COLUMN "placeholder" varchar;
  ALTER TABLE "payload_cms"."_steps_v" ADD COLUMN "version_subtitle" varchar;
  ALTER TABLE "payload_cms"."_steps_v" ADD COLUMN "version_placeholder" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_cms"."steps" DROP COLUMN "subtitle";
  ALTER TABLE "payload_cms"."steps" DROP COLUMN "placeholder";
  ALTER TABLE "payload_cms"."_steps_v" DROP COLUMN "version_subtitle";
  ALTER TABLE "payload_cms"."_steps_v" DROP COLUMN "version_placeholder";`)
}
