# Supabase Authentication Configuration Guide

This guide explains how to properly configure Supabase for authentication in the Tiny Leagues application.

## Required URL Configuration in Supabase Dashboard

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project
3. Go to **Authentication** > **URL Configuration**
4. Update the **Site URL** to `https://tinyleagues.co` (without any path)
5. Under **Redirect URLs**, ensure you have the following URLs:
   - `https://tinyleagues.co/auth/reset-password`
   - `https://tinyleagues.co/games`
6. Remove any URLs that contain `/tiny-leagues/` or `/auth/callback`
7. Save the changes

## Email Template Configuration

1. In the Supabase dashboard, go to **Authentication** > **Email Templates**
2. For the **Password Reset** template:
   - Ensure the template uses `{{ .ConfirmationURL }}` for the reset link
   - The reset link should redirect users to the `/auth/reset-password` page
   - You can use our custom email template from the `email-templates` directory

## Testing the Password Reset Flow

After making these changes:

1. Go to the login page and click "Forgot Password"
2. Enter your email address
3. Check your email for the reset link
4. Click the link - it should take you directly to the reset password page
5. Enter your new password and confirm it
6. You should be redirected to the login page

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Verify that the Supabase URL configuration is correct
3. Ensure the email templates are using the correct URL variables
4. Try clearing your browser cache or using an incognito window

## Authentication Flow

Our authentication system now uses a simplified flow:

1. **Sign Up**: Users provide email, password, and referral code
2. **Sign In**: Users provide email and password
3. **Password Reset**:
   - User requests a reset link
   - User receives email with link to `/auth/reset-password`
   - Supabase handles the token validation automatically
   - User sets a new password
   - User is redirected to login 