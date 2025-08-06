# Trip Sheet Management Application

## Overview

This is a trip sheet management application for auto drivers. It allows drivers to submit trip details including start and end kilometers, fuel consumption, cash collected, and route information.

## Features

- Submit trip sheet data with validation
- Store trip data in Supabase database
- Audit logging for trip submissions
- Responsive UI built with React and Tailwind CSS

## Project Structure

- `src/` - React frontend code
  - `components/` - Reusable UI components
  - `lib/` - Utility functions and configuration
- `supabase/` - Supabase configuration and Edge Functions
  - `functions/` - Serverless Edge Functions
    - `trip-entry/` - API endpoint for submitting trip data

## Setup and Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start the development server:

```bash
npm start
```

## Supabase Edge Functions

The application uses Supabase Edge Functions to handle API requests. The main function is:

- `trip-entry` - Handles POST requests to `/api/trip-entry` for submitting trip data

### Authentication Flow

1. The frontend obtains a JWT token from Supabase Auth when the user logs in
2. When submitting a trip sheet, the frontend includes this token in the Authorization header
3. The Edge Function manually verifies this token using `supabaseClient.auth.getUser()`
4. This manual verification approach is why we use the `--no-verify-jwt` flag when serving functions locally

### Deploying Edge Functions

1. Install the Supabase CLI:

```bash
npm install -g supabase
```

2. Link your project:

```bash
supabase link --project-ref your_project_ref
```

3. Deploy the function:

```bash
supabase functions deploy trip-entry
```

## Database Schema

The application uses the following tables in Supabase:

- `tripsheets` - Stores trip data
  - `id` - UUID, primary key
  - `driver_id` - String, references drivers table
  - `car_id` - String, references cars table
  - `trip_date` - Date
  - `start_km` - Number
  - `end_km` - Number
  - `fuel_kg` - Number, optional
  - `cash_collected` - Number, optional
  - `route` - String
  - `notes` - String, optional
  - `created_at` - Timestamp

- `audit_logs` - Stores audit logs
  - `id` - UUID, primary key
  - `action` - String
  - `entity_id` - UUID, references the affected entity
  - `user_id` - UUID, references the user who performed the action
  - `details` - JSON, additional details about the action
  - `created_at` - Timestamp

## Technologies Used

- React
- Tailwind CSS
- Supabase (Database, Authentication, Edge Functions)
- React Hook Form with Zod validation