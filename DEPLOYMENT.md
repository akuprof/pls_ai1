# Deployment Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://bezbxacfnfgbbvgtwhxh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJ4YWNmbmZnYmJ2Z3R3aHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjI4ODgsImV4cCI6MjA3MDAzODg4OH0.xHEX04V8uwol9mSQzvB3GwcfpUzkf6mbaq7cgf0nL34

# Build optimizations
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true
```

## Vercel Deployment

1. The `vercel.json` file is already configured with environment variables
2. The build should now work with the updated React versions and Supabase configuration
3. Environment variables are automatically set for production deployment

## Build Fixes Applied

1. **React Version**: Updated to React 18.3.1 for better compatibility
2. **Package Resolution**: Added resolutions field to ensure consistent React versions
3. **Build Optimization**: Disabled source map generation to reduce build size
4. **NPM Configuration**: Added `.npmrc` with legacy peer deps support
5. **JSConfig**: Added `jsconfig.json` for better module resolution
6. **Supabase Configuration**: Updated to use environment variables with fallbacks

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

## Local Testing

```bash
npm install -g serve
serve -s build
```

This will serve your production build locally at http://localhost:3000 