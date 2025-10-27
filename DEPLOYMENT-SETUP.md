# Vercel Deployment Setup - Three Environments

## ✅ Setup Complete!

All three environments are now properly configured and deployed on Vercel with their respective Firebase projects.

---

## 🌐 Live URLs

### 🟢 Production Environment
- **Branch**: `main`
- **Firebase Project**: `donateequity-prod`
- **URL**: https://donate-equity.vercel.app
- **Environment Variables**: From `.env.production`

### 🟡 Staging Environment
- **Branch**: `staging`
- **Firebase Project**: `donateequity-staging`
- **URL**: https://donate-equity-git-staging-bpnsolutions.vercel.app
- **Environment Variables**: From `.env.staging`

### 🔵 Development Environment
- **Branch**: `develop`
- **Firebase Project**: `donateequity-6d8a4` (DonateEquity)
- **URL**: https://donate-equity-git-develop-bpnsolutions.vercel.app
- **Environment Variables**: From `.env.local`

---

## 📋 Branch Structure

All three branches are now synchronized and at the same commit point:

```
main (production) ────────────┐
                              ├──── All synced to latest staging commit
staging ──────────────────────┤
                              │
develop ──────────────────────┘
```

---

## 🔧 Environment Variables Configuration

Environment variables are configured per branch in Vercel:

- **Production**: Only deploys from `main` branch
- **Preview (Staging)**: Only deploys from `staging` branch
- **Preview (Development)**: Only deploys from `develop` branch

Each environment has its own complete set of environment variables including:
- Firebase configuration (API keys, project IDs, auth domains)
- Firebase Admin SDK credentials
- DocuSign API credentials
- 409.ai Valuation Service configuration
- Resend API key
- Environment-specific URLs and settings

---

## 🚀 Deployment Workflow

### Deploying to Development
```bash
git checkout develop
# Make your changes
git add .
git commit -m "Your commit message"
git push origin develop
```
Vercel will automatically deploy to: https://donate-equity-git-develop-bpnsolutions.vercel.app

### Deploying to Staging
```bash
git checkout staging
git merge develop  # Merge develop into staging
git push origin staging
```
Vercel will automatically deploy to: https://donate-equity-git-staging-bpnsolutions.vercel.app

### Deploying to Production
```bash
git checkout main
git merge staging  # Merge staging into main
git push origin main
```
Vercel will automatically deploy to: https://donate-equity.vercel.app

---

## 🔐 Security Notes

- All environment variables are encrypted in Vercel
- Each environment connects to its own Firebase project
- Never commit `.env` files to the repository
- Environment variables are managed through Vercel dashboard or CLI

---

## 🛠️ Updating Environment Variables

If you need to update environment variables in the future:

### Option 1: Use the Script (Recommended)
```bash
# Edit the appropriate .env file (.env.production, .env.staging, or .env.local)
# Then run:
./setup-vercel-env.sh
```

### Option 2: Vercel Dashboard
Visit: https://vercel.com/bpnsolutions/donate-equity/settings/environment-variables

### Option 3: Vercel CLI
```bash
# Add a new variable
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview staging
vercel env add VARIABLE_NAME preview develop

# Remove a variable
vercel env rm VARIABLE_NAME

# List all variables
vercel env ls
```

---

## 📊 Firebase Projects

### Production
- **Project ID**: `donateequity-prod`
- **Console**: https://console.firebase.google.com/project/donateequity-prod

### Staging
- **Project ID**: `donateequity-staging`
- **Console**: https://console.firebase.google.com/project/donateequity-staging

### Development
- **Project ID**: `donateequity-6d8a4`
- **Console**: https://console.firebase.google.com/project/donateequity-6d8a4

---

## ✅ Verification Checklist

- [x] All three branches synced to same commit
- [x] Production environment deployed from `main`
- [x] Staging environment deployed from `staging`
- [x] Development environment deployed from `develop`
- [x] Environment variables configured for all three environments
- [x] Each environment connected to correct Firebase project
- [x] All deployments successful and accessible

---

## 🆘 Troubleshooting

### If a deployment fails:
1. Check the build logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Ensure Firebase project is accessible
4. Check for TypeScript errors: `npm run build`

### If environment variables need to be updated:
1. Update the appropriate `.env.*` file
2. Run `./setup-vercel-env.sh` to upload changes
3. Trigger a new deployment by pushing to the branch

### To trigger a manual deployment:
```bash
git commit --allow-empty -m "Trigger deployment"
git push origin <branch-name>
```

---

**Last Updated**: October 26, 2025
**Setup Status**: ✅ Complete and Verified
