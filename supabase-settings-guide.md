# Fixing Supabase Password Reset URLs

The password reset emails are currently using an incorrect redirect URL that includes `/tiny-leagues/` in the path. To fix this, you need to update your Supabase project settings.

## Option 1: Update Site URL in Supabase Dashboard

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project
3. Go to **Authentication** > **URL Configuration**
4. Update the **Site URL** to `https://tinyleagues.co` (without any path)
5. Save the changes

## Option 2: Update Redirect URLs in Supabase Dashboard

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project
3. Go to **Authentication** > **URL Configuration**
4. Under **Redirect URLs**, add the following URLs:
   - `https://tinyleagues.co/auth/reset-password`
   - `https://tinyleagues.co/auth/callback`
   - `https://tinyleagues.co/games`
5. Remove any URLs that contain `/tiny-leagues/`
6. Save the changes

## Testing the Fix

After making these changes:

1. Try the "Forgot Password" flow again
2. Check the URL in the email you receive
3. The URL should now redirect to `https://tinyleagues.co/auth/reset-password` without the `/tiny-leagues/` path

## Additional Notes

- It may take a few minutes for the changes to propagate
- If you're still seeing the old URL, try clearing your browser cache or using an incognito window
- Make sure all your code is using the correct paths (which we've already updated) 