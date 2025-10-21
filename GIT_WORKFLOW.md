# Git Branching & Deployment Workflow

## Branch Structure

```
main                     → Production (live users)
  ↑ PR only
staging                  → Staging (UX testing)
  ↑ PR only
develop                  → Development (integration)
  ↑ merge
feature/feature-name     → Feature work
```

## Environment Mapping

| Branch    | Firebase Project       | Vercel Deployment      | Purpose                |
|-----------|------------------------|------------------------|------------------------|
| `main`    | donateequity-prod      | Production             | Live users             |
| `staging` | donateequity-staging   | Preview (staging)      | UX team testing        |
| `develop` | donateequity-6d8a4     | Preview (development)  | Development integration|
| `feature/*` | donateequity-6d8a4   | Preview (per PR)       | Feature development    |

## Daily Workflow

### Starting New Work

```bash
# Always branch from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name
```

### Working on Feature

```bash
# Make changes, commit often
git add .
git commit -m "Your commit message"

# Push to GitHub (creates preview deployment in Vercel)
git push origin feature/your-feature-name
```

### Completing a Feature

```bash
# 1. Update from develop
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git merge develop

# 2. Create Pull Request to develop (on GitHub)
# - Review the preview deployment
# - Get code review
# - Merge PR

# 3. Delete local feature branch
git checkout develop
git pull origin develop
git branch -d feature/your-feature-name
```

### Promoting to Staging (for UX Testing)

```bash
# When develop is stable and ready for UX team
git checkout staging
git pull origin staging
git merge develop

# Push to staging (triggers staging deployment)
git push origin staging

# UX team tests at: https://your-project-git-staging.vercel.app
```

### Deploying to Production

```bash
# Only after thorough testing on staging
git checkout main
git pull origin main
git merge staging

# Push to production (triggers production deployment)
git push origin main

# Production goes live at: https://your-domain.com
```

## Quick Commands

```bash
# Check current branch
git branch

# Switch branches
git checkout develop
git checkout staging
git checkout main

# Create new feature branch
git checkout develop
git checkout -b feature/new-feature

# View all branches
git branch -a

# Delete feature branch (after merged)
git branch -d feature/branch-name
```

## Firebase Project Switching

```bash
# When working locally, match your Firebase project to your branch
firebase use default      # develop/feature branches (donateequity-6d8a4)
firebase use staging      # staging branch (donateequity-staging)
firebase use production   # main branch (donateequity-prod)
```

## Vercel Environment Variables

### Production (`main` branch)
- Set environment to: **Production**
- Uses `.env.production` variables
- `NEXT_PUBLIC_ENVIRONMENT=production`

### Staging (`staging` branch)  
- Set environment to: **Preview** (filtered to staging branch)
- Uses `.env.staging` variables
- `NEXT_PUBLIC_ENVIRONMENT=staging`

### Development (`develop` & `feature/*` branches)
- Set environment to: **Preview**
- Uses `.env.local` variables
- `NEXT_PUBLIC_ENVIRONMENT=development`

## Testing Strategy

### Local Development
```bash
# Run local dev server
npm run dev

# Seed test users (dev/staging only)
npm run seed-test-users

# Uses .env.local (donateequity-6d8a4)
```

### Staging Testing
1. Push to `staging` branch
2. Wait for Vercel deployment
3. Share staging URL with UX team
4. Test accounts available: donor@test.com, nonprofit@test.com, appraiser@test.com
5. All use password: TestPassword123!

### Production
1. Only deploy from `staging` after thorough testing
2. No test accounts in production
3. Real user data only

## Common Scenarios

### "I need to work on a new feature"
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
# ... make changes ...
git push origin feature/my-new-feature
# Create PR to develop on GitHub
```

### "UX team needs to test"
```bash
git checkout staging
git merge develop
git push origin staging
# Share staging URL with UX team
```

### "Emergency hotfix needed in production"
```bash
git checkout main
git checkout -b hotfix/critical-bug
# ... fix bug ...
git checkout main
git merge hotfix/critical-bug
git push origin main

# Don't forget to merge back to staging and develop
git checkout staging
git merge main
git push origin staging

git checkout develop  
git merge staging
git push origin develop
```

### "I want to test with staging Firebase locally"
```bash
# Copy staging credentials
cp .env.staging .env.local
# Or manually update .env.local

# Switch Firebase CLI
firebase use staging

# Run dev server
npm run dev
```

## Rules

✅ **DO:**
- Branch from `develop` for new features
- Create PRs for all changes
- Test on preview deployments before merging
- Merge `develop` → `staging` → `main` in order
- Run `npm run build` before creating PRs
- Keep commits small and focused

❌ **DON'T:**
- Commit directly to `main`, `staging`, or `develop`
- Merge `main` into `staging` or `develop` (only merge upward)
- Push `.env` files (they're gitignored)
- Run `seed-test-users` in production
- Skip testing on staging before production deploy

## Branch Protection (Recommended GitHub Settings)

### `main` branch
- Require pull request reviews (1+ approvals)
- Require status checks to pass
- No direct pushes
- No force pushes

### `staging` branch  
- Require pull request reviews (optional)
- Require status checks to pass
- No force pushes

### `develop` branch
- Require status checks to pass
- No force pushes
