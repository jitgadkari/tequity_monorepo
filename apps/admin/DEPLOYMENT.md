# Platform Deployment Guide

## Overview

This guide covers deploying the SaaS Platform to Vercel with automated CI/CD using GitHub Actions for both development and production environments.

## Prerequisites

- GitHub repository with the platform code
- Vercel account
- Production database (Neon, Supabase, or PostgreSQL)

## 1. Setup Vercel Project

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login and Link Project

```bash
# Login to Vercel
vercel login

# Link your project
cd /Users/ajitgadkari/Documents/Free/saas_platoform
vercel link
```

Follow the prompts:
- Set up and deploy? **N** (we'll use GitHub Actions)
- Link to existing project? Create a new one
- Project name: **saas-platform** (or your preferred name)
- Directory: **.** (current directory)

### Step 3: Get Vercel Credentials

After linking, check `.vercel/project.json`:

```bash
cat .vercel/project.json
```

You'll need:
- `orgId` - Your Vercel Organization ID
- `projectId` - Your Vercel Project ID

Get your Vercel Token:
- Go to https://vercel.com/account/tokens
- Create a new token
- Save it securely

## 2. Setup GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

### Required Secrets:

1. **VERCEL_TOKEN**
   - Your Vercel API token from https://vercel.com/account/tokens

2. **VERCEL_ORG_ID**
   - From `.vercel/project.json` (orgId field)

3. **VERCEL_PROJECT_ID**
   - From `.vercel/project.json` (projectId field)

### Development Environment Secrets:

4. **DATABASE_URL_DEV**
   - Development database URL
   - Example: `postgresql://user:pass@dev-host:5432/platform_dev`

5. **JWT_SECRET_DEV**
   - Development JWT secret
   - Example: `dev-jwt-secret-key-123`

6. **NEXT_PUBLIC_CUSTOMER_APP_URL_DEV**
   - Development WeaveDesk URL
   - Example: `http://localhost:3001` or `https://dev-weavedesk.vercel.app`

### Production Environment Secrets:

7. **DATABASE_URL_PROD**
   - Production database URL
   - Example: `postgresql://user:pass@prod-host:5432/platform_prod`

8. **JWT_SECRET_PROD**
   - Production JWT secret (use strong random string)
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

9. **NEXT_PUBLIC_CUSTOMER_APP_URL_PROD**
   - Production WeaveDesk URL
   - Example: `https://weavedesk.com`

## 3. Configure Vercel Environment Variables

Go to your Vercel project dashboard:
**Settings → Environment Variables**

### For Preview (Development):

Add these variables and select **Preview** environment:

1. **DATABASE_URL** → Value from DATABASE_URL_DEV
2. **JWT_SECRET** → Value from JWT_SECRET_DEV
3. **NEXT_PUBLIC_CUSTOMER_APP_URL** → Value from NEXT_PUBLIC_CUSTOMER_APP_URL_DEV

### For Production:

Add these variables and select **Production** environment:

1. **DATABASE_URL** → Value from DATABASE_URL_PROD
2. **JWT_SECRET** → Value from JWT_SECRET_PROD
3. **NEXT_PUBLIC_CUSTOMER_APP_URL** → Value from NEXT_PUBLIC_CUSTOMER_APP_URL_PROD

## 4. Setup GitHub Environments

Go to your GitHub repository:
**Settings → Environments**

### Create Development Environment:

1. Click "New environment"
2. Name: **development**
3. Deployment branches:
   - Specify branches: `dev`, `develop`, `development`
4. No required reviewers (optional for dev)
5. Save

### Create Production Environment:

1. Click "New environment"
2. Name: **production**
3. Deployment branches:
   - Specify branches: `main`, `master`
4. **Add required reviewers** (recommended)
5. Enable deployment protection rules (optional)
6. Save

## 5. Branch Strategy

Create the required branches:

```bash
# If you're on main/master, create dev branch
git checkout -b dev
git push origin dev

# Set default branch to main if not already
# GitHub → Settings → Branches → Default branch → main
```

## 6. Test Deployment

### Test Development Deployment:

```bash
# Make a change
git checkout dev
echo "# Test deployment" >> TEST.md
git add TEST.md
git commit -m "Test development deployment"
git push origin dev

# Check GitHub Actions
# Go to: Repository → Actions tab
# You should see "Deploy Platform to Vercel (Development)" running
```

### Test Production Deployment:

```bash
# Merge to main
git checkout main
git merge dev
git push origin main

# Check GitHub Actions
# Go to: Repository → Actions tab
# You should see "Deploy Platform to Vercel (Production)" running
```

## 7. Workflow Files

Two GitHub Actions workflows have been created:

### `.github/workflows/deploy-development.yml`

**Triggers:**
- Push to `dev`, `develop`, or `development` branches
- Pull requests to these branches

**Actions:**
- Checkout code
- Setup Node.js
- Install Vercel CLI
- Build project with dev environment variables
- Deploy to Vercel Preview
- Comment PR with deployment URL

### `.github/workflows/deploy-production.yml`

**Triggers:**
- Push to `main` or `master` branch
- GitHub releases

**Actions:**
- Checkout code
- Setup Node.js
- Install dependencies
- Run database migrations
- Build project with prod environment variables
- Deploy to Vercel Production
- Send deployment notification

## 8. Deployment URLs

After deployment, your platform will be available at:

**Development:**
- Preview URL: `https://saas-platform-{hash}-{team}.vercel.app`
- Automatically commented on PRs

**Production:**
- Vercel URL: `https://saas-platform.vercel.app`
- Custom Domain: Configure in Vercel dashboard

## 9. Configure Custom Domain (Production)

### In Vercel Dashboard:

1. Go to your project
2. Settings → Domains
3. Add your custom domain (e.g., `platform.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (can take up to 24 hours)

### Update GitHub Secret:

Once custom domain is configured, update the production workflow URL:
- Edit `.github/workflows/deploy-production.yml`
- Change `url: https://your-platform-domain.com` to your actual domain

## 10. Database Migrations

### Development:

Migrations run automatically on push to dev branch via GitHub Actions.

### Production:

Migrations run automatically before production deployment. The workflow includes:

```yaml
- name: Run database migrations
  run: npm run db:push
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
```

**Important:** Ensure your production database is backed up before pushing to main!

## 11. Monitoring Deployments

### GitHub Actions Dashboard:

- View all deployments: **Repository → Actions tab**
- Check logs for any failures
- Monitor build times

### Vercel Dashboard:

- View deployment history
- Check build logs
- Monitor performance
- View analytics

## 12. Rollback Strategy

### Option 1: Vercel Dashboard

1. Go to **Deployments** in Vercel
2. Find the previous working deployment
3. Click **•••** → **Promote to Production**

### Option 2: Git Revert

```bash
git revert HEAD
git push origin main
# GitHub Actions will automatically deploy the reverted version
```

### Option 3: Vercel CLI

```bash
vercel rollback [deployment-url] --token=$VERCEL_TOKEN
```

## 13. Troubleshooting

### Build Fails: "Missing environment variable"

**Solution:** Check that all secrets are added in:
- GitHub Secrets (Settings → Secrets)
- Vercel Environment Variables (Settings → Environment Variables)

### Build Fails: "Database connection failed"

**Solution:**
- Verify DATABASE_URL is correct
- Check database is accessible from Vercel's IP addresses
- For Neon/Supabase, ensure connection pooling is enabled

### Deployment succeeds but app doesn't work

**Solution:**
- Check Vercel logs for runtime errors
- Verify all environment variables are set correctly
- Ensure NEXT_PUBLIC_ variables are set for client-side code

### "vercel: command not found" in GitHub Actions

**Solution:** This is handled automatically by the workflow. If you see this locally:
```bash
npm install -g vercel
```

## 14. Security Best Practices

1. **Never commit secrets to git**
   - All secrets should be in GitHub Secrets or Vercel Environment Variables

2. **Use strong JWT secrets in production**
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Rotate secrets regularly**
   - Update JWT_SECRET and database passwords periodically

4. **Use different databases for dev and prod**
   - Never use production database for development

5. **Enable required reviewers for production**
   - Prevent accidental production deployments

## 15. Cost Considerations

### Vercel Free Tier:

- Hobby plan: Free for personal projects
- 100GB bandwidth/month
- Unlimited deployments

### Vercel Pro:

- $20/month per user
- 1TB bandwidth/month
- Better performance
- Team collaboration

### Database Costs:

- **Neon**: Free tier available, paid plans from $19/month
- **Supabase**: Free tier available, paid plans from $25/month
- **AWS RDS**: Varies by instance type

## 16. Next Steps

After successful deployment:

1. ✅ Update platform URLs in `.env.example`
2. ✅ Document production URL for your team
3. ✅ Set up monitoring (Sentry, LogRocket)
4. ✅ Configure error alerting
5. ✅ Set up database backups
6. ✅ Enable Vercel Analytics
7. ✅ Configure custom domain
8. ✅ Set up status page monitoring

## Support

For issues with:
- **GitHub Actions**: Check Actions tab logs
- **Vercel Deployment**: Check Vercel deployment logs
- **Database**: Check database provider logs

---

**Deployment Status:**

- ✅ GitHub Actions workflows created
- ✅ Vercel configuration ready
- ⏳ Awaiting GitHub secrets configuration
- ⏳ Awaiting first deployment
