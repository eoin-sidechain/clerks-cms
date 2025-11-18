# Deployment Guide: PayloadCMS to Production

Complete guide for deploying this PayloadCMS Next.js application to production using Supabase (database + S3 storage) and Vercel hosting.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Supabase Storage Setup](#supabase-storage-setup)
4. [Environment Variables](#environment-variables)
5. [Vercel Deployment](#vercel-deployment)
6. [Database Migration](#database-migration)
7. [Post-Deployment Steps](#post-deployment-steps)
8. [Data Migration (Optional)](#data-migration-optional)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] GitHub account with repository access
- [ ] Supabase account (https://supabase.com)
- [ ] Vercel account (https://vercel.com)
- [ ] All local development and imports completed
- [ ] Code committed and pushed to GitHub

---

## Supabase Setup

### 1. Create a New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `clerks-cms-production` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Click "Create new project"
5. Wait for project creation (takes ~2 minutes)

### 2. Get Database Connection String

1. In your Supabase project, go to **Settings** > **Database**
2. Scroll to **Connection String** section
3. Select **Connection pooling** tab (important for Vercel!)
4. Mode: **Transaction**
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password
7. Save this connection string securely - you'll need it for `DATABASE_URL`

**Why connection pooling?** Vercel uses serverless functions that create many database connections. Connection pooling prevents "too many connections" errors.

### 3. Verify Database Access

Test your connection string locally (optional but recommended):

```bash
# Install psql if needed
# Then test connection
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

If successful, you should see the PostgreSQL prompt.

---

## Supabase Storage Setup

### 1. Create S3 Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Settings:
   - **Name**: `payload-media`
   - **Public bucket**: ✅ Enable (for public read access to uploaded images)
   - **File size limit**: 50MB (or adjust based on your needs)
   - **Allowed MIME types**: Leave default or customize
4. Click "Create bucket"

### 2. Configure Bucket Policies

The bucket needs to be publicly readable but only writable by authenticated services:

1. Click on `payload-media` bucket
2. Go to **Policies** tab
3. Click "New policy" and add:

**Policy for public read:**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payload-media');
```

**Policy for authenticated write:**
```sql
CREATE POLICY "Authenticated write access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payload-media');
```

**Policy for authenticated update/delete:**
```sql
CREATE POLICY "Authenticated update/delete"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payload-media');
```

### 3. Get S3 Credentials

1. Go to **Settings** > **API**
2. Scroll to **S3 Access Keys** section
3. Click "Create new access key"
4. Save both:
   - `Access Key ID`
   - `Secret Access Key`

### 4. Note S3 Endpoint

Your S3 endpoint will be:
```
https://[project-ref].supabase.co/storage/v1/s3
```

Replace `[project-ref]` with your actual project reference (found in Settings > General > Reference ID)

---

## Environment Variables

### Production Environment Variables

You'll need these environment variables in Vercel. Generate strong random strings for all secrets:

```bash
# Database
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# PayloadCMS Secrets (generate strong random strings)
PAYLOAD_SECRET=[generate-with: openssl rand -base64 32]
CRON_SECRET=[generate-with: openssl rand -base64 32]
PREVIEW_SECRET=[generate-with: openssl rand -base64 32]

# Server URL (Vercel will auto-set VERCEL_PROJECT_PRODUCTION_URL)
NEXT_PUBLIC_SERVER_URL=https://your-domain.vercel.app

# Supabase S3 Storage
S3_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=[your-access-key-from-supabase]
S3_SECRET_ACCESS_KEY=[your-secret-key-from-supabase]
S3_BUCKET=payload-media
S3_REGION=us-east-1
```

### Generate Secrets

Use these commands to generate secure secrets:

```bash
# Generate PAYLOAD_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32

# Generate PREVIEW_SECRET
openssl rand -base64 32
```

Save all generated secrets securely - you'll add them to Vercel.

---

## Vercel Deployment

### 1. Push Code to GitHub

Ensure all your code is committed and pushed:

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 3. Configure Build Settings

**Framework Preset**: Next.js (auto-detected)

**Build & Development Settings**:
- **Build Command**: `pnpm run ci`
  - This runs migrations AND builds (important!)
- **Output Directory**: `.next` (default)
- **Install Command**: `pnpm install` (default)

**Root Directory**: `.` (leave as root)

**Node.js Version**: 20.x

### 4. Add Environment Variables

In the Vercel project settings, add ALL environment variables from the section above:

1. Click "Environment Variables" tab
2. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select **Production**, **Preview**, and **Development**

**Critical Variables** (must be set before first deploy):
- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_REGION`

**Optional but Recommended**:
- `NEXT_PUBLIC_SERVER_URL` (can use Vercel's auto-generated URL)
- `CRON_SECRET` (needed for cron jobs)
- `PREVIEW_SECRET` (needed for draft previews)

### 5. Deploy

1. Click "Deploy"
2. Wait for deployment (first deployment runs migrations!)
3. Monitor build logs for any errors

**What happens during first deployment:**
- Dependencies install
- `pnpm run ci` executes:
  - Runs `payload migrate` (creates database schema)
  - Runs `next build` (builds the application)
- Vercel deploys to production

---

## Database Migration

### Understanding Migrations

The project uses PayloadCMS migrations in the `/migrations` directory. These define your database schema.

### First Deployment Migration

✅ **Automatic!** The `pnpm run ci` command (set as build command) automatically runs migrations before building.

The first deployment will:
1. Connect to your Supabase database
2. Create the `payload_cms` schema
3. Create all tables (users, media, art, films, albums, books, steps, sections, applications, etc.)
4. Set up indexes and relationships

### Subsequent Deployments

Future deployments will:
- Run any new migration files
- Skip already-applied migrations
- Safely update schema without data loss

### Manual Migration (if needed)

To run migrations manually:

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@..."

# Run migrations
pnpm payload migrate
```

---

## Post-Deployment Steps

### 1. Verify Deployment

1. Visit your Vercel deployment URL
2. You should see the application running
3. Check for any errors in Vercel logs

### 2. Create First Admin User

1. Navigate to `https://your-domain.vercel.app/admin`
2. You should see the "Create First User" screen
3. Fill in:
   - **Email**: Your admin email
   - **Password**: Strong password
4. Click "Create"

### 3. Test Media Upload

1. Log in to admin panel
2. Go to **Collections** > **Media**
3. Click "Create New"
4. Upload a test image
5. Verify it uploads to Supabase S3 bucket
6. Check the image URL - should point to Supabase storage

### 4. Verify Cron Jobs (Optional)

The app has a cron job configured in `vercel.json`:
- **Endpoint**: `/api/payload-jobs/run`
- **Schedule**: Daily at midnight
- **Purpose**: Process scheduled publishing

To test manually:

```bash
curl -X POST https://your-domain.vercel.app/api/payload-jobs/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain
3. Follow DNS setup instructions
4. Update `NEXT_PUBLIC_SERVER_URL` environment variable to your custom domain
5. Redeploy

---

## Data Migration (Optional)

If you have existing data from local development that you want to migrate to production:

### Option 1: Re-import from Seed Data

**Recommended if you have clean seed data in `seed_data/` directory**

1. Set production environment variables locally:
   ```bash
   # In a temporary .env file or export
   export DATABASE_URL="[production-database-url]"
   export S3_ENDPOINT="[production-s3-endpoint]"
   export S3_ACCESS_KEY_ID="[production-key]"
   export S3_SECRET_ACCESS_KEY="[production-secret]"
   export S3_BUCKET="payload-media"
   export S3_REGION="us-east-1"
   ```

2. Run import scripts:
   ```bash
   pnpm import:all
   pnpm import:steps
   pnpm import:steps:advanced
   pnpm import:statements
   pnpm import:applications
   ```

3. Verify data in production admin panel

### Option 2: Database Export/Import

**For migrating existing database with user-created content**

1. Export from local PostgreSQL:
   ```bash
   pg_dump -h localhost -p 54322 -U postgres -d postgres \
     --schema=payload_cms \
     --data-only \
     --no-owner \
     -f payload_data.sql
   ```

2. Import to Supabase:
   ```bash
   psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
     -f payload_data.sql
   ```

### Option 3: PayloadCMS API Export/Import

Use PayloadCMS REST API to export/import data programmatically. This gives you the most control but requires custom scripting.

### Media Files Migration

If you have existing media in local storage:

1. **Locate local files**: `public/media/` directory
2. **Upload to Supabase S3**:
   - Use Supabase CLI or S3-compatible tools
   - Maintain same file structure
3. **Update database references** (if needed):
   - PayloadCMS stores S3 keys in database
   - May need to update `media` collection records

**Recommended**: Re-upload media through PayloadCMS admin panel to ensure proper S3 integration.

---

## Troubleshooting

### Database Connection Issues

**Error**: "Too many connections"
- ✅ **Solution**: Ensure you're using connection pooling URL (port 6543, not 5432)
- ✅ **Verify**: Connection string includes `?pgbouncer=true`

**Error**: "SSL connection required"
- ✅ **Solution**: Supabase requires SSL by default (already configured)

**Error**: "Schema 'payload_cms' does not exist"
- ✅ **Solution**: Migrations didn't run. Check build logs and ensure `pnpm run ci` is the build command

### S3 Storage Issues

**Error**: "Access Denied" when uploading
- ✅ **Solution**: Verify S3 credentials are correct
- ✅ **Check**: Bucket policies allow authenticated writes

**Error**: "Bucket does not exist"
- ✅ **Solution**: Create `payload-media` bucket in Supabase Storage
- ✅ **Verify**: Bucket name matches `S3_BUCKET` environment variable

**Images not loading publicly**
- ✅ **Solution**: Ensure bucket is set to "Public"
- ✅ **Check**: Bucket policies allow public reads

### Build Failures

**Error**: "Build command failed"
- ✅ **Check**: Build logs in Vercel
- ✅ **Verify**: All required environment variables are set
- ✅ **Common**: Missing `DATABASE_URL` or S3 variables

**Error**: "Module not found"
- ✅ **Solution**: Ensure `pnpm install` runs successfully
- ✅ **Check**: Dependencies in `package.json` are correct

### Runtime Errors

**Error**: "PAYLOAD_SECRET is required"
- ✅ **Solution**: Add `PAYLOAD_SECRET` to environment variables
- ✅ **Redeploy** after adding

**Error**: "Cannot connect to database"
- ✅ **Check**: `DATABASE_URL` is correct
- ✅ **Verify**: Supabase database is running
- ✅ **Test**: Connection string works locally

### Cron Job Issues

**Error**: Cron job not running
- ✅ **Check**: Vercel plan supports cron jobs (Free tier: daily only)
- ✅ **Verify**: `vercel.json` is in repository root
- ✅ **Test**: Manually trigger endpoint with `CRON_SECRET`

### Performance Issues

**Slow API responses**
- ✅ **Consider**: Supabase region (choose closer to users)
- ✅ **Check**: Database query performance
- ✅ **Optimize**: Add database indexes if needed

**Slow image loading**
- ✅ **Solution**: Supabase S3 has CDN built-in
- ✅ **Consider**: Next.js image optimization (already configured)

---

## Security Checklist

Before going live:

- [ ] All secrets (`PAYLOAD_SECRET`, etc.) are strong, random, and unique
- [ ] `.env.local` is in `.gitignore` (never committed)
- [ ] Database uses connection pooling for Vercel
- [ ] S3 bucket has proper read/write policies
- [ ] Admin panel is secured (requires authentication)
- [ ] CORS is properly configured
- [ ] Cron endpoints are protected with `CRON_SECRET`
- [ ] SSL/HTTPS is enforced (automatic with Vercel)
- [ ] Database credentials use limited-scope roles if possible

---

## Monitoring & Maintenance

### Vercel Logs

- Access at: Vercel Dashboard > Project > Deployments > (select deployment) > Logs
- Monitor for errors and warnings
- Check cron job execution logs

### Supabase Monitoring

- **Database**: Supabase Dashboard > Database > Query Performance
- **Storage**: Supabase Dashboard > Storage > Usage
- **API**: Supabase Dashboard > API Logs

### Regular Tasks

- Monitor database size and growth
- Check S3 storage usage
- Review Vercel function execution times
- Update dependencies regularly
- Backup database periodically (Supabase has automatic backups)

---

## Support & Resources

- **PayloadCMS Docs**: https://payloadcms.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Quick Reference

### Deployment Checklist

**Pre-deployment:**
- [ ] Supabase project created
- [ ] Database connection string obtained
- [ ] S3 bucket created (`payload-media`)
- [ ] S3 credentials generated
- [ ] All secrets generated
- [ ] Code pushed to GitHub

**Vercel setup:**
- [ ] Repository imported to Vercel
- [ ] Build command set to `pnpm run ci`
- [ ] All environment variables added
- [ ] Deploy initiated

**Post-deployment:**
- [ ] Application accessible
- [ ] Admin user created
- [ ] Media upload tested
- [ ] Cron jobs verified (if applicable)
- [ ] Custom domain configured (if applicable)

### Environment Variables Quick List

```bash
# Required
DATABASE_URL=
PAYLOAD_SECRET=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=payload-media
S3_REGION=us-east-1

# Optional but Recommended
NEXT_PUBLIC_SERVER_URL=
CRON_SECRET=
PREVIEW_SECRET=
```

---

**You're now ready to deploy! 🚀**

Follow the steps in order, and you'll have your PayloadCMS application running on Vercel with Supabase in production.
