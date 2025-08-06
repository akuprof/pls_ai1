# Supabase Edge Functions

This directory contains Supabase Edge Functions for the trip sheet management application.

## Available Functions

### trip-entry

Handles the submission of trip sheet data from the frontend application.

- **Endpoint**: `/api/trip-entry`
- **Method**: POST
- **Authentication**: Required
- **Description**: Validates and inserts trip sheet data into the `tripsheets` table and logs the action to the `audit_logs` table.

## Local Development

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Start the local development server:
   ```bash
   supabase functions serve --no-verify-jwt
   ```
   
   > **Note about `--no-verify-jwt`**: This flag is used because the `trip-entry` function manually verifies the user's session using `supabaseClient.auth.getUser()`. For functions that don't require user context or handle authentication differently, you might omit this flag or use a different auth strategy.

3. Test the function locally:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/trip-entry \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"driver_id":"123","car_id":"456","trip_date":"2023-06-01","start_km":1000,"end_km":1050,"route":"City Center"}'
   ```

## Deployment

Deploy the function to your Supabase project:

```bash
supabase functions deploy trip-entry
```

## Environment Variables

The following environment variables are required:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key (for client-side operations)

These are automatically available in the Supabase Edge Functions environment.