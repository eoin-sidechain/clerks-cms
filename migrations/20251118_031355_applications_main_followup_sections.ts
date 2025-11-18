import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Add new columns for main and follow-up sections
  await db.execute(sql`
    ALTER TABLE "payload_cms"."applications"
    ADD COLUMN "main_sections" INTEGER[];
  `)

  await db.execute(sql`
    ALTER TABLE "payload_cms"."applications"
    ADD COLUMN "follow_up_sections" INTEGER[];
  `)

  // Drop the old sections column
  await db.execute(sql`
    ALTER TABLE "payload_cms"."applications"
    DROP COLUMN IF EXISTS "sections";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Restore old sections column
  await db.execute(sql`
    ALTER TABLE "payload_cms"."applications"
    ADD COLUMN "sections" INTEGER[];
  `)

  // Drop the new columns
  await db.execute(sql`
    ALTER TABLE "payload_cms"."applications"
    DROP COLUMN IF EXISTS "main_sections";
  `)

  await db.execute(sql`
    ALTER TABLE "payload_cms"."applications"
    DROP COLUMN IF EXISTS "follow_up_sections";
  `)
}
