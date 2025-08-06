# Supabase Authentication Setup Guide

## 🔧 Fixing the "Invalid API key" Error

The "Invalid API key" error occurs when Supabase authentication is not properly configured. Follow these steps to fix it:

### Step 1: Verify Your Supabase Project Settings

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `bezbxacfnfgbbvgtwhxh`

2. **Check API Keys**
   - Go to **Settings** → **API**
   - Verify the following:
     - **Project URL**: `https://bezbxacfnfgbbvgtwhxh.supabase.co`
     - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJ4YWNmbmZnYmJ2Z3R3aHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjI4ODgsImV4cCI6MjA3MDAzODg4OH0.gc5OBKBsjpF8J65-cqiiotL7hGIdwSdLY60vRS2VD3Y`

### Step 2: Configure Authentication Settings

1. **Go to Authentication Settings**
   - Navigate to **Authentication** → **Settings**

2. **Enable Email Authentication**
   - ✅ **Enable Email Signup**: Turn ON
   - ✅ **Enable Email Confirmations**: Turn ON
   - ✅ **Enable Password Authentication**: Turn ON

3. **Configure Email Templates**
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation email if needed

### Step 3: Set Up Site URL

1. **Go to Authentication Settings**
   - Navigate to **Authentication** → **Settings**

2. **Add Site URL**
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### Step 4: Test the Connection

After making these changes, test the connection:

1. **Open Browser Console**
   - Press F12 in your browser
   - Go to the Console tab

2. **Check for Connection Messages**
   - You should see: "Supabase connection successful"
   - If you see errors, they will help identify the issue

### Step 5: Alternative - Use Environment Variables

If the hardcoded keys don't work, try using environment variables:

1. **Create a `.env` file in your project root:**
   ```
   REACT_APP_SUPABASE_URL=https://bezbxacfnfgbbvgtwhxh.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJ4YWNmbmZnYmJ2Z3R3aHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjI4ODgsImV4cCI6MjA3MDAzODg4OH0.gc5OBKBsjpF8J65-cqiiotL7hGIdwSdLY60vRS2VD3Y
   ```

2. **Update `src/lib/supabase.js`:**
   ```javascript
   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bezbxacfnfgbbvgtwhxh.supabase.co';
   const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJ4YWNmbmZnYmJ2Z3R3aHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjI4ODgsImV4cCI6MjA3MDAzODg4OH0.gc5OBKBsjpF8J65-cqiiotL7hGIdwSdLY60vRS2VD3Y';
   ```

### Step 6: Common Issues and Solutions

#### Issue 1: "Invalid API key"
**Solution:**
- Verify the API key in Supabase Dashboard
- Make sure you're using the **Anon Key** (not Service Role Key)
- Check that the key hasn't been regenerated

#### Issue 2: "Email not confirmed"
**Solution:**
- Go to **Authentication** → **Users**
- Find your user and click "Confirm" manually
- Or check your email for the confirmation link

#### Issue 3: "Site URL not allowed"
**Solution:**
- Add your site URL to the allowed redirect URLs in Supabase
- For development: `http://localhost:3000`
- For production: Your deployed URL

### Step 7: Test Authentication

1. **Try signing up with a new email**
2. **Check your email for confirmation**
3. **Sign in with the confirmed account**

### Step 8: Database Setup

Make sure you've run the authentication SQL script:

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Run the authentication system SQL script** (from `supabase/migrations/20250806_authentication_system.sql`)

### Troubleshooting Commands

If you're still having issues, try these commands:

```bash
# Rebuild the application
npm run build

# Start the development server
npm start

# Test the production build
npx serve -s build
```

### Support

If you're still experiencing issues:

1. **Check the browser console** for specific error messages
2. **Verify your Supabase project** is active and not paused
3. **Ensure your API keys** are correct and not expired
4. **Test with a simple Supabase client** to isolate the issue

The most common cause of "Invalid API key" is either:
- Using the wrong API key (Service Role instead of Anon)
- Supabase project being paused or inactive
- Authentication settings not properly configured 