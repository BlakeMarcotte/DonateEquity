# UX Testing Guide - DonateEquity Platform

Welcome to the DonateEquity UX testing environment! This guide will help you test all three user roles without needing multiple email accounts.

---

## 🚀 Quick Start

### 1. Run the Seed Script (One Time Setup)

Before testing, run this command to create all test accounts and data:

```bash
npm run seed-ux-testing
```

This creates:
- 3 pre-configured test accounts
- 1 active campaign
- 1 donation/pledge linking all three roles
- 9 workflow tasks assigned to the appropriate roles

### 2. Access the Application

Navigate to your staging environment URL (or `http://localhost:3000` for local testing).

---

## 🔐 Test Accounts

All accounts use the **same password: `UXTest2024!`**

### Donor Account
- **Email:** `donor@uxtest.com`
- **Name:** Sarah Chen
- **Company:** TechStartup Inc.
- **Role:** Donor

### Nonprofit Account
- **Email:** `nonprofit@uxtest.com`
- **Name:** Michael Rodriguez
- **Organization:** Save The Planet Foundation
- **Role:** Nonprofit Admin (with admin permissions)

### Appraiser Account
- **Email:** `appraiser@uxtest.com`
- **Name:** Jennifer Liu
- **Company:** Elite Appraisal Services
- **Role:** Appraiser

---

## 🧪 Testing Workflow

### Step 1: Test as DONOR (Sarah Chen)

1. **Log in** with `donor@uxtest.com` / `UXTest2024!`

2. **Explore the dashboard:**
   - View your organization (TechStartup Inc.)
   - See available campaigns
   - Check your profile

3. **View your pledge/donation:**
   - Navigate to your donations/pledges page
   - You should see an active pledge to "Education for All Initiative"
   - Estimated value: $50,000

4. **Test task management:**
   - View your task list
   - Task 1 (Invite Appraiser) should be marked as COMPLETED
   - Task 2 (Sign NDA) should be PENDING/ACTIVE
   - Other tasks should be BLOCKED (waiting on dependencies)
   - Try to complete a task if the UI allows

5. **Test document upload:**
   - If available, try uploading documents
   - Check file validation and error handling

6. **Log out** when done

### Step 2: Test as NONPROFIT (Michael Rodriguez)

1. **Log in** with `nonprofit@uxtest.com` / `UXTest2024!`

2. **Explore the dashboard:**
   - View your organization (Save The Planet Foundation)
   - See your campaigns
   - Check organizational settings

3. **View your campaign:**
   - Find "Education for All Initiative" campaign
   - See campaign details (goal: $500,000)
   - Check campaign management features

4. **View incoming donation:**
   - Navigate to donations/pledges section
   - Find Sarah Chen's pledge ($50,000)
   - Review donor information
   - Check status and details

5. **Test task management:**
   - View tasks assigned to you
   - Should see tasks like "Nonprofit: Approve Documents"
   - These will be BLOCKED until earlier workflow steps complete
   - Explore task details and dependencies

6. **Test team management:**
   - View team members
   - Check permissions (you have admin role)
   - Explore invitation features (if you want to test invites with real emails)

7. **Log out** when done

### Step 3: Test as APPRAISER (Jennifer Liu)

1. **Log in** with `appraiser@uxtest.com` / `UXTest2024!`

2. **Explore the dashboard:**
   - View your organization (Elite Appraisal Services)
   - See assigned appraisal tasks
   - Check your profile

3. **View assigned appraisal:**
   - Navigate to your tasks/assignments
   - Find the appraisal for Sarah Chen's donation
   - View donation details:
     - Company: TechStartup Inc.
     - Estimated Value: $50,000
     - Equity Type: Common Stock

4. **Test task management:**
   - View your assigned tasks
   - Should see "Appraiser: Sign NDA" (BLOCKED)
   - Should see "Appraiser: Upload Documents" (BLOCKED)
   - These are blocked until donor completes earlier steps
   - Explore task details

5. **Test document review:**
   - Once donor uploads company info, you'd be able to review
   - Check document viewing capabilities
   - Test upload functionality for appraisal reports

6. **Log out** when done

---

## 🔄 Testing Cross-Role Workflows

### Complete Workflow Test

To test the full donation lifecycle:

1. **As Donor:**
   - Complete Task 2: Sign NDA
   - Complete Task 3: Make commitment decision
   - Complete Task 4: Upload company information

2. **As Appraiser:**
   - Tasks should now unblock
   - Complete Task 5: Sign appraiser NDA
   - Complete Task 6: Upload appraisal documents

3. **As Donor:**
   - Complete Task 7: Approve appraisal documents

4. **As Nonprofit:**
   - Complete Task 8: Approve all documents
   - Complete Task 9: Upload final receipts

5. **Verify:**
   - Check that each role sees updates in real-time
   - Verify task dependencies work correctly
   - Test notifications (if implemented)

---

## 📋 Key Features to Test

### For All Roles
- [ ] Login/logout functionality
- [ ] Dashboard navigation
- [ ] Profile management
- [ ] Notifications (if implemented)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Error handling
- [ ] Loading states

### Donor-Specific
- [ ] View available campaigns
- [ ] Create new pledge (try creating a second pledge)
- [ ] View existing pledges
- [ ] Upload documents
- [ ] Sign documents (DocuSign integration if available)
- [ ] Task completion
- [ ] Document approval workflow

### Nonprofit-Specific
- [ ] Campaign creation
- [ ] Campaign management
- [ ] View all donations/pledges
- [ ] Donor information access
- [ ] Document review and approval
- [ ] Team member management
- [ ] Organizational settings

### Appraiser-Specific
- [ ] View assigned appraisals
- [ ] Access donor information (after NDA)
- [ ] Upload appraisal reports
- [ ] Document uploads
- [ ] Task completion
- [ ] Communication with donor/nonprofit

---

## 🐛 Common Testing Scenarios

### Happy Path
1. Donor creates pledge
2. Appraiser is invited/assigned
3. Donor uploads documents
4. Appraiser signs NDA
5. Appraiser uploads valuation
6. Both parties approve
7. Nonprofit finalizes donation

### Error Scenarios
- Try accessing pages without proper permissions
- Try completing tasks out of order
- Try uploading invalid file types
- Try accessing other users' data
- Test form validation

### Edge Cases
- Very long organization names
- Special characters in inputs
- Large file uploads
- Slow network conditions
- Browser back button behavior

---

## 📝 Feedback Checklist

As you test, please note:

### User Experience
- [ ] Is the navigation intuitive?
- [ ] Are task instructions clear?
- [ ] Is the workflow easy to understand?
- [ ] Are error messages helpful?
- [ ] Is the design consistent?

### Functionality
- [ ] Do all buttons work?
- [ ] Do forms validate correctly?
- [ ] Do uploads succeed?
- [ ] Do page transitions work smoothly?
- [ ] Does data persist correctly?

### Performance
- [ ] Do pages load quickly?
- [ ] Are there any laggy interactions?
- [ ] Do uploads progress smoothly?
- [ ] Are loading states shown appropriately?

### Accessibility
- [ ] Can you navigate with keyboard only?
- [ ] Are colors readable?
- [ ] Is text size appropriate?
- [ ] Are interactive elements clearly marked?

---

## 🔧 Troubleshooting

### Can't log in?
- Verify you're using the correct email/password
- Check that the seed script ran successfully
- Try running `npm run seed-ux-testing` again

### Don't see any data?
- Make sure you logged in with the correct account
- Check that the seed script completed without errors
- Verify you're on the correct environment (staging, not production)

### Tasks aren't working?
- Check task dependencies - many tasks are blocked by earlier tasks
- Verify you're logged in as the correct role for that task
- Try refreshing the page

### Need to reset everything?
- Run `npm run seed-ux-testing` again
- The script is idempotent (safe to run multiple times)
- It will update existing data

---

## 📞 Support

If you encounter issues:

1. **Take screenshots** of any errors or unexpected behavior
2. **Note the steps** to reproduce the issue
3. **Check browser console** for error messages (F12 → Console)
4. **Document your feedback** with specific page names and actions

---

## 🎯 Key Testing Goals

Focus on:

1. **User Flow Clarity** - Can users understand what to do next?
2. **Task Management** - Does the task system make sense?
3. **Role Separation** - Does each role see appropriate information?
4. **Document Workflow** - Is uploading/reviewing documents intuitive?
5. **Overall Polish** - Does it feel professional and trustworthy?

---

## ⚠️ Important Notes

- **This is a testing environment** - Data may be reset periodically
- **Don't use real personal information** - Use test data only
- **Don't test email flows** - Pre-seeded accounts bypass email verification
- **Focus on UX, not invitations** - Invitation flows require multiple real emails
- **Log out between role switches** - To see each perspective clearly

---

## 🏁 Quick Reference Card

Keep this handy while testing:

```
DONOR LOGIN:
Email: donor@uxtest.com
Pass:  UXTest2024!
Name:  Sarah Chen

NONPROFIT LOGIN:
Email: nonprofit@uxtest.com
Pass:  UXTest2024!
Name:  Michael Rodriguez

APPRAISER LOGIN:
Email: appraiser@uxtest.com
Pass:  UXTest2024!
Name:  Jennifer Liu
```

---

Happy Testing! 🚀
