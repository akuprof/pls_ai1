# Daily Audit Engine Script

This script automatically detects anomalies in your fleet data on a daily basis.

## Setup Instructions

### 1. Environment Variables

You need to set the following environment variables:

```bash
export SUPABASE_URL="https://bezbxacfnfgbbvgtwhxh.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Important**: Use the Service Role Key (not the Anon Key) for backend scripts. Find it in your Supabase Dashboard under Project Settings > API Keys.

### 2. Running the Script

#### Local Development:
```bash
deno run --allow-env --allow-net scripts/daily-audit-engine.ts
```

#### Production (Scheduled):
Set up a cron job or use a cloud scheduler to run this script daily.

## What the Script Does

### Anomaly Detection:

1. **Missing Entry**: Detects if a driver had no trip entry for yesterday
2. **No Entry > 2 Days**: Detects if a driver has had no entries for 3 consecutive days
3. **Fuel > 15kg**: Detects trips with fuel consumption exceeding 15kg
4. **Potential Cash Mismatch**: Detects potentially low cash collection for long trips

### Database Operations:

- Inserts detected anomalies into the `anomalies` table
- Logs audit actions to the `audit_logs` table
- Handles errors gracefully with proper logging

## Scheduling Options

### Option 1: Cron Job (Linux/Mac)
```bash
# Add to crontab - runs daily at 6 AM
0 6 * * * cd /path/to/your/project && deno run --allow-env --allow-net scripts/daily-audit-engine.ts
```

### Option 2: Windows Task Scheduler
Create a scheduled task to run the script daily.

### Option 3: Cloud Services
- **Google Cloud Scheduler**
- **AWS EventBridge**
- **Azure Logic Apps**
- **cron-job.org** (free online service)

## Monitoring

Check the audit logs in your Supabase database:
```sql
SELECT * FROM audit_logs WHERE action = 'DAILY_AUDIT_RUN' ORDER BY created_at DESC;
```

## Error Handling

The script includes comprehensive error handling:
- Logs errors to the `audit_logs` table
- Continues execution even if individual operations fail
- Provides detailed console output for debugging 