# Equity Donation Platform - Development Guide

## Project Overview
A Next.js/TypeScript application enabling donors to pre-commit equity donations to nonprofits upon liquidity events. The platform facilitates campaign creation, donor commitments, and manages the appraisal/documentation workflow through shared task lists.

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Firebase (Firestore, Authentication, Storage, Functions)
- **Authentication**: Firebase Auth with custom claims for role-based access
- **Document Management**: DocuSign API integration
- **File Storage**: Firebase Storage with enterprise-level security
- **Styling**: Tailwind CSS (recommended for rapid development)

## MVP User Roles
1. **Donors** - Create commitments to donate equity upon liquidity events
2. **Nonprofit Admins** - Create campaigns, manage donations, coordinate workflows
3. **Appraisers** - Conduct valuations, submit appraisal documents

## Core Features (MVP)

### Authentication & Authorization
- Firebase Authentication with custom claims
- Role-based access control (RBAC)
- Enterprise-level Firestore security rules
- Secure storage bucket access rules

### Campaign Management
- Nonprofits create campaigns with monetary goals
- Campaign visibility and discovery
- Real-time progress tracking

### Donation Workflow
- Donors browse and commit to campaigns
- Pre-commitment system for future liquidity events
- Shared task list creation upon donation initiation

### Shared Task System
- Dynamic task lists between Donor, Nonprofit Admin, and Appraiser
- Document signing workflow via DocuSign
- File sharing through secure storage buckets
- Task completion tracking and notifications

### Document & File Management
- Secure document storage in Firebase Storage
- Organized folder structure per donation/campaign
- DocuSign integration for appraisal documents
- Version control and audit trails

## Development Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier configuration
- Comprehensive error handling
- Input validation and sanitization
- Unit and integration testing

### Security Standards
- Production-ready Firestore rules from day one
- Principle of least privilege for all access
- Input sanitization and XSS prevention
- CSRF protection
- Secure API key management
- Audit logging for sensitive operations

### Performance
- Next.js App Router for optimal performance
- Image optimization
- Lazy loading and code splitting
- Firebase query optimization
- Caching strategies

## Firebase Architecture

### Firestore Collections Structure
```
campaigns/
  {campaignId}/
    - title, description, goal, createdBy, status
    - subcollections: donations/, tasks/

users/
  {userId}/
    - profile data, role, organizationId

organizations/
  {orgId}/
    - nonprofit/appraiser organization data

donations/
  {donationId}/
    - campaignId, donorId, amount, status, commitmentDetails
    - subcollections: tasks/, documents/

tasks/
  {taskId}/
    - assignedTo, type, status, dependencies, dueDate

documents/
  {docId}/
    - type, storageUrl, signatureStatus, uploadedBy
```

### Custom Claims Structure
```typescript
interface CustomClaims {
  role: 'donor' | 'nonprofit_admin' | 'appraiser' | 'admin';
  organizationId?: string;
  permissions: string[];
}
```

### Storage Bucket Structure
```
donations/{donationId}/
  legal/
  financial/
  appraisals/
  signed-documents/
shared/{campaignId}/
  campaign-materials/
```

## API Integration Guidelines

### DocuSign Integration
- **Always search for latest DocuSign API documentation** before implementation
- Use DocuSign eSignature REST API v2.1+
- Implement webhook handlers for status updates
- Store envelope IDs in Firestore for tracking
- Handle signature completion workflows

### External API Best Practices
- **Search internet for most recent API documentation** for all integrations
- Implement proper error handling and retry logic
- Use environment variables for API keys
- Rate limiting and request throttling
- Comprehensive logging for API interactions

## Security Rules Templates

### Firestore Rules (Production-Ready)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Campaign access based on role
    match /campaigns/{campaignId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.token.role == 'nonprofit_admin';
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.token.role == 'admin');
    }
    
    // Donation access - participants only
    match /donations/{donationId} {
      allow read, write: if request.auth != null && 
        (resource.data.donorId == request.auth.uid ||
         resource.data.nonprofitAdminId == request.auth.uid ||
         resource.data.appraiserId == request.auth.uid ||
         request.auth.token.role == 'admin');
    }
  }
}
```

### Storage Rules (Production-Ready)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /donations/{donationId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        (isParticipant(donationId) || 
         request.auth.token.role == 'admin');
    }
  }
  
  function isParticipant(donationId) {
    return exists(/databases/$(database)/documents/donations/$(donationId)) &&
           (get(/databases/$(database)/documents/donations/$(donationId)).data.donorId == request.auth.uid ||
            get(/databases/$(database)/documents/donations/$(donationId)).data.nonprofitAdminId == request.auth.uid ||
            get(/databases/$(database)/documents/donations/$(donationId)).data.appraiserId == request.auth.uid);
  }
}
```

## Version Control & Documentation Management

### Git Workflow
- **Always commit changes to GitHub** after implementing features or fixes
- Use descriptive commit messages following conventional commits format
- Create branches for significant features and merge via pull requests
- Maintain clean commit history with atomic commits

### Claude.md File Management
- **Update this claude.md file immediately** after making any architectural changes
- Document new features, API integrations, or structural modifications
- Keep the file synchronized with the actual codebase state
- Include any new environment variables, dependencies, or configuration changes
- Update security rules, data models, and API documentation as they evolve
- Track major decisions and their rationale for future reference

### Commit Message Format
```
type(scope): description

Examples:
feat(auth): implement role-based access control
fix(docusign): resolve webhook signature verification
docs(claude): update firebase security rules documentation
refactor(storage): optimize file organization structure
```

## Future Expansion (Post-MVP)
- Attorney role integration
- Financial Professional workflows
- Community Foundation Member features
- Advanced campaign analytics
- Mobile app development

## Development Best Practices
- Implement feature flags for gradual rollouts
- Use Git flow branching strategy
- Automated testing pipeline
- Environment-specific configurations
- Comprehensive error monitoring and logging
- Regular security audits and penetration testing

## Environment Variables Template
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Private Firebase Admin
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_BASE_PATH=

# Application Settings
NODE_ENV=
NEXT_PUBLIC_APP_URL=
```

## Notes for Claude Code Development
- Always prioritize security and follow enterprise standards
- Search for the most recent API documentation when implementing integrations
- Implement comprehensive error handling and logging
- Use TypeScript strictly - no `any` types in production code
- Follow Next.js best practices for performance and SEO
- Ensure all Firebase operations are optimized for cost and performance
- Implement proper loading states and user feedback
- Consider accessibility (WCAG 2.1 AA compliance)
- Plan for scalability from the beginning