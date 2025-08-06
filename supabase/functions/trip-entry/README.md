# Trip Entry Edge Function

## Overview

This Edge Function handles the submission of trip sheet data from the frontend application. It validates the data, inserts it into the `tripsheets` table, and logs the action to the `audit_logs` table.

## Authentication Strategy

This function uses a manual JWT verification approach:

1. The frontend obtains a JWT token from Supabase Auth when the user logs in
2. When submitting a trip sheet, the frontend includes this token in the Authorization header
3. The function manually verifies this token using `supabaseClient.auth.getUser()`
4. If verification fails, the function returns a 401 Unauthorized response

## The `--no-verify-jwt` Flag

When running this function locally with the Supabase CLI, you should use the `--no-verify-jwt` flag:

```bash
supabase functions serve --no-verify-jwt
```

This flag is necessary because:

- By default, Supabase Edge Functions automatically verify JWT tokens before executing the function
- Since we're manually verifying the token inside our function using `supabaseClient.auth.getUser()`, we need to disable the automatic verification
- Without this flag, the function would perform double verification, which could lead to unexpected behavior

## Function Behavior

1. Verifies that the request is a POST request
2. Authenticates the user using the JWT token in the Authorization header
3. Validates the trip sheet data (required fields, value ranges, etc.)
4. Inserts the data into the `tripsheets` table
5. Logs the action to the `audit_logs` table
6. Returns a success or error response with appropriate status code

## Request Format

```json
{
  "driver_id": "string",
  "car_id": "string",
  "trip_date": "YYYY-MM-DD",
  "start_km": number,
  "end_km": number,
  "fuel_kg": number (optional),
  "cash_collected": number (optional),
  "route": "string",
  "notes": "string" (optional)
}
```

## Response Format

### Success (201 Created)

```json
{
  "message": "Trip sheet saved successfully",
  "trip": {
    "id": "uuid",
    "driver_id": "string",
    "car_id": "string",
    "trip_date": "YYYY-MM-DD",
    "start_km": number,
    "end_km": number,
    "fuel_kg": number,
    "cash_collected": number,
    "route": "string",
    "notes": "string",
    "created_at": "timestamp"
  }
}
```

### Error (400, 401, 405, 500)

```json
{
  "error": "Error message",
  "details": "Additional error details" (optional)
}
```