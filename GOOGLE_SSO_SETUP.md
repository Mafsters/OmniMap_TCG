# Google SSO Setup Guide

This guide will help you configure Google Single Sign-On (SSO) for OmniMap.

## Prerequisites

- Access to Google Cloud Console (or ask your IT team)
- Your company's Google Workspace domain (e.g., `yourcompany.com`)

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Identity Services API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Identity Services API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "Internal" (for company use) or "External"
   - Fill in required fields (App name, User support email, etc.)
   - Add your email to test users if using External
4. Select application type: **Web application**
5. Configure:
   - **Name**: OmniMap (or your preferred name)
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs**: Leave empty (not needed for Google Identity Services)
6. Click "Create"
7. **Copy the Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your values:
   ```
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
   VITE_GOOGLE_WORKSPACE_DOMAIN=yourcompany.com
   ```

3. **Important**: Never commit `.env` to version control (it's already in `.gitignore`)

## Step 4: Ensure Employee Records Have Email Addresses

For Google SSO to work, your Employee records in Google Sheets must include email addresses. The system will match authenticated Google users to Employee records by email.

Make sure your Employees sheet has an email column, or update the sheet structure to include email addresses.

## Step 5: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. You should see a "Sign in with Google" button
4. Click it and sign in with your company Google account
5. The system should automatically match you to your Employee record

## Troubleshooting

### "Google Identity Services not loaded"
- Make sure the Google script is loading (check browser console)
- Verify your Client ID is correct
- Check that the script tag is in `index.html`

### "Access restricted to [domain] accounts only"
- Verify `VITE_GOOGLE_WORKSPACE_DOMAIN` matches your company domain
- Make sure you're signing in with a company Google Workspace account

### "No employee record found"
- Ensure your Employee records in Google Sheets include email addresses
- Verify the email in your Google account matches the email in the Employee record
- Check that employees have been synced from Google Sheets

### Button doesn't appear
- Check browser console for errors
- Verify `VITE_GOOGLE_CLIENT_ID` is set correctly
- Make sure the Google Identity Services script loaded successfully

## Security Notes

- The Client ID is safe to expose in frontend code (it's public)
- Tokens are stored in sessionStorage (cleared when browser closes)
- Domain restriction ensures only company accounts can access
- Employee matching by email prevents unauthorized access

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure your Google Cloud project has the correct APIs enabled
4. Contact your IT team if you need help with Google Cloud Console access
