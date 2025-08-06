# Deployment Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Build optimizations
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://bezbxacfnfgbbvgtwhxh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJ4YWNmbmZnYmJ2Z3R3aHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjI4ODgsImV4cCI6MjA3MDAzODg4OH0.gc5OBKBsjpF8J65-cqiiotL7hGIdwSdLY60vRS2VD3Y
```

## Vercel Deployment

1. The `vercel.json` file is already configured for Create React App
2. Make sure to set the environment variables in your Vercel project settings
3. The build should now work with the updated React versions

## Build Fixes Applied

1. **React Version**: Downgraded from 18.3.1 to 18.2.0 for better compatibility
2. **Package Resolution**: Added resolutions field to ensure consistent React versions
3. **Build Optimization**: Disabled source map generation to reduce build size
4. **NPM Configuration**: Added `.npmrc` with legacy peer deps support
5. **JSConfig**: Added `jsconfig.json` for better module resolution

## Troubleshooting

If you still encounter build issues:

1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules and package-lock.json
3. Run `npm install` again
4. Try building locally first: `npm run build`

## Local Development

```bash
npm install
npm start
```

## Production Build

```bash
npm run build
``` 