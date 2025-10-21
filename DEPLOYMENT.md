# Deployment Guide - Multi-Environment Setup

## Overview

This project uses a three-environment deployment strategy:
- **Development** - Local development (`localhost:3000`)
- **Staging** - Pre-production testing (`staging.yourdomain.com`)
- **Production** - Live application (`app.donateequity.com`)

---

## 🔥 Step 1: Create Firebase Projects

### Create Staging Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" → Name it `donateequity-staging`
3. Enable Google Analytics (optional)
4. Once created, click the gear icon → Project Settings

### Get Firebase Config (Staging)

1. Under "Your apps", click the web icon `</>`
2. Register app: `DonateEquity Staging`
3. Copy the config values to your `.env.staging` file
4. Go to **Service Accounts** tab → **Generate New Private Key**
5. Copy the values from downloaded JSON to `.env.staging`

### Enable Firebase Services (Staging)


1. **Authentication**
   - Go to Authentication → Get Started
   - Enable Email/Password provider

2. **Firestore Database**
   - Go to Firestore Database → Create Database
   - Start in **production mode** (we have security rules)
   - Choose a location (e.g., `us-central1`)

3. **Storage**
   - Go to Storage → Get Started
   - Start in **production mode**

4. **Deploy Security Rules**
   ```bash
   # Make sure you're in project directory
   firebase use --add
   # Select donateequity-staging, give it alias "staging"
   
   firebase deploy --only firestore:rules,storage:rules -P staging
   ```

### Repeat for Production

Follow the same steps but name it `donateequity-prod` and use alias `production`.

---

## 🚀 Step 2: Vercel Deployment Setup

### Prerequisites
- GitHub repository with your code
- Vercel account (free tier works)

### Create Vercel Projects

#### 1. Production Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Project Name**: `donate-equity-production`
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Environment Variables** (copy from `.env.production.example`):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_PRIVATE_KEY=...
   FIREBASE_CLIENT_EMAIL=...
   DOCUSIGN_INTEGRATION_KEY=...
   DOCUSIGN_USER_ID=...
   DOCUSIGN_PRIVATE_KEY=...
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://app.donateequity.com
   NEXT_PUBLIC_ENVIRONMENT=production
   RESEND_API_KEY=...
   VALUATION_409AI_CLIENT_ID=...
   VALUATION_409AI_CLIENT_SECRET=...
   VALUATION_409AI_API_URL=...
   ```

6. **Git Branch**: `main`
7. Click "Deploy"

#### 2. Staging Project

1. Repeat the process
2. Configure:
   - **Project Name**: `donate-equity-staging`
   - **Environment Variables**: Use `.env.staging` values
   - **Git Branch**: `staging`
   - **NEXT_PUBLIC_ENVIRONMENT**: `staging`

---

## 🌳 Step 3: Git Branch Strategy

### Create Staging Branch

```bash
# Create staging branch from main
git checkout -b staging main

# Push to GitHub
git push -u origin staging
```

### Branch Protection (Recommended)

In GitHub repository settings:
1. Go to Settings → Branches → Add rule
2. For `main` branch:
   - Require pull request reviews
   - Require status checks to pass
3. For `staging` branch:
   - Require status checks to pass

### Development Workflow

```bash
# Feature development
git checkout -b feature/new-feature staging
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/new-feature

# Create PR to staging → test on staging.yourdomain.com

# After approval, merge to staging
# Test thoroughly

# Then PR from staging → main for production
```

---

## 🧪 Step 4: Testing Setup

### Seed Test Users (Staging/Development only)

```bash
# Install tsx if not already installed
npm install -D tsx

# Run seeding script
npm run seed-test-users
```

This creates three test accounts:
- `donor@test.com` / `TestPassword123!` (Donor role)
- `nonprofit@test.com` / `TestPassword123!` (Nonprofit Admin)
- `appraiser@test.com` / `TestPassword123!` (Appraiser)

**⚠️ WARNING**: Never run this in production!

### Add Environment Banner

Add to your root layout (`app/layout.tsx`):

```typescript
import { EnvironmentBanner } from '@/components/environment-banner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <EnvironmentBanner />
        {children}
      </body>
    </html>
  )
}
```

---

## 📋 Deployment Checklist

### Before First Staging Deployment

- [ ] Created `donateequity-staging` Firebase project
- [ ] Enabled Firebase Auth, Firestore, Storage
- [ ] Deployed security rules to staging Firebase
- [ ] Created `.env.staging` with all variables
- [ ] Created `staging` branch in GitHub
- [ ] Created Vercel staging project
- [ ] Configured Vercel environment variables
- [ ] Linked Vercel to `staging` branch
- [ ] Deployed to staging
- [ ] Tested staging deployment
- [ ] Ran `npm run seed-test-users` in staging
- [ ] Verified test accounts work

### Before First Production Deployment

- [ ] Created `donateequity-prod` Firebase project
- [ ] Enabled Firebase services (Auth, Firestore, Storage)
- [ ] Deployed security rules to production Firebase
- [ ] Created `.env.production` with production values
- [ ] Updated DocuSign to production credentials
- [ ] Created production Resend API key
- [ ] Configured production domain in Vercel
- [ ] Created Vercel production project
- [ ] Configured Vercel environment variables
- [ ] Linked Vercel to `main` branch
- [ ] Tested thoroughly on staging first
- [ ] Created production backup strategy
- [ ] Set up monitoring/error tracking (Sentry recommended)

### For Each Deployment

**To Staging:**
```bash
git checkout staging
git merge develop  # or merge feature branch
git push origin staging
# Vercel auto-deploys
```

**To Production:**
```bash
# First, ensure staging is stable
git checkout main
git merge staging
git push origin main
# Vercel auto-deploys
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use example files** - `.env.*.example` files are safe to commit
3. **Rotate secrets** - If any secret is exposed, rotate immediately
4. **Firebase rules** - Always deploy security rules before opening to users
5. **CORS settings** - Configure Firebase to only allow your domains
6. **Test accounts** - Only in development/staging, never production

---

## 🛠️ Troubleshooting

### Deployment fails with Firebase error
- Verify all `FIREBASE_*` environment variables are set
- Check that `FIREBASE_PRIVATE_KEY` includes `\n` newlines (should be quoted)
- Ensure Firebase project has all services enabled

### Environment banner not showing
- Check `NEXT_PUBLIC_ENVIRONMENT` is set correctly
- Clear browser cache
- Verify component is imported in layout

### Test users not working
- Verify you're not in production environment
- Check Firebase Auth is enabled
- Check Firestore security rules allow writes
- View Firebase Console Auth & Firestore for created users

### Custom domain not working (Vercel)
1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (5-10 minutes)

---

## 📊 Monitoring (Optional but Recommended)

### Sentry Setup
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Add to environment variables:
```
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=staging  # or production
```

### Vercel Analytics
Already included with Vercel deployment - view in Vercel dashboard.

---

## 🎯 Quick Reference

| Environment | Branch    | Firebase Project       | URL                           |
|-------------|-----------|------------------------|-------------------------------|
| Development | any       | donateequity-6d8a4     | http://localhost:3000         |
| Staging     | `staging` | donateequity-staging   | https://staging.yourdomain.com|
| Production  | `main`    | donateequity-prod      | https://app.donateequity.com  |

**Test Accounts** (Dev/Staging only):
- donor@test.com / TestPassword123!
- nonprofit@test.com / TestPassword123!
- appraiser@test.com / TestPassword123!
