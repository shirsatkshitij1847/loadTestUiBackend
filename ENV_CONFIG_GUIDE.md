# Environment Configuration Guide

All hardcoded variables have been centralized to `.env` file. This guide explains each configuration option.

---

## Configuration Categories

### AWS Credentials & Region
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-north-1
```
- **AWS_ACCESS_KEY_ID**: AWS IAM access key for S3 API calls
- **AWS_SECRET_ACCESS_KEY**: AWS IAM secret key
- **AWS_REGION**: AWS region for S3 buckets (default: `eu-north-1`)

### S3 Buckets
```env
S3_BUCKET_NAME=sas-migration-result-eveidence
S3_METADATA_BUCKET=sas-metadata-db
S3_ARTIFACTS_BUCKET=playwright-runner-artifacts
```
- **S3_BUCKET_NAME**: Bucket containing test execution traces (used in `getAllFailedTraces.js`, `getFailedTraceViewers.js`, `s3ResultCreationService.js`)
- **S3_METADATA_BUCKET**: Bucket containing test metadata (used in `testExecutionMetaData.js`)
- **S3_ARTIFACTS_BUCKET**: Bucket for test artifacts (currently in .env for future use)

### Server Configuration
```env
NODE_ENV=development
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:5173
```
- **NODE_ENV**: Environment mode (`development`, `production`) - used for logging and error handling
- **SERVER_PORT**: Port on which the Express server runs (default: `3000`)
- **CORS_ORIGIN**: Allowed origin for CORS requests, typically your frontend URL (default: `http://localhost:5173`)

### Cache Configuration
```env
CACHE_TTL_MINUTES=10
```
- **CACHE_TTL_MINUTES**: Time-to-live for trace viewer response cache in minutes (default: `10`)
- Converts to milliseconds internally: `10 * 60 * 1000 = 600,000ms`
- Affects how long `/api/traces/:executionId` responses are cached

### Trace Service Configuration
```env
TRACE_SERVICE_BASE_URL=https://trace.triratnaakolayouth.com
```
- **TRACE_SERVICE_BASE_URL**: Base URL for the trace viewer service (used in `getFailedTraceViewers.js`)
- Example full URL: `https://trace.triratnaakolayouth.com/trace/trace-file.zip?testExecutionId=123`

### ECS Configuration (for test execution)
```env
ECS_CLUSTER=artilleryfargate_clone_cluster
TASK_DEFINITION=sas_loadtest_cluster_new:3
SUBNET_ID=subnet-04f52bc836a6eebec
SECURITY_GROUP_ID=sg-0111f937374b24eca
```
- Used for running load tests on AWS ECS
- **ECS_CLUSTER**: Fargate cluster name
- **TASK_DEFINITION**: ECS task definition with version
- **SUBNET_ID**: VPC subnet for ECS tasks
- **SECURITY_GROUP_ID**: Security group for ECS tasks

### Load Test Configuration
```env
LOADTEST_PROJECT_ZIP=loadtest-playwright-project.zip
TEST_EXECUTION_ID=testexecution1234
RUNNER_FILE_NAME=artillery.js
CONTAINER_NAME=Main
USERS=[{"username":"practice","password":"SuperSecretPassword!","vuId":"vu38d000","state":"IN_USE"}]
```
- Configuration for load test execution
- **LOADTEST_PROJECT_ZIP**: Zip file name containing test scripts
- **TEST_EXECUTION_ID**: Default test execution ID
- **RUNNER_FILE_NAME**: Artillery runner file
- **CONTAINER_NAME**: Docker container name
- **USERS**: JSON array of virtual user configurations

---

## Files Using Environment Variables

| File | Variables Used |
|------|-----------------|
| `server.js` | `SERVER_PORT`, `CORS_ORIGIN`, `CACHE_TTL_MINUTES`, `NODE_ENV` |
| `getAllFailedTraces.js` | `AWS_REGION`, `S3_BUCKET_NAME` |
| `getFailedTraceViewers.js` | `TRACE_SERVICE_BASE_URL` |
| `testExecutionMetaData.js` | `AWS_REGION`, `S3_METADATA_BUCKET` |
| `s3ResultCreationService.js` | `S3_BUCKET_NAME`, `AWS_REGION` (already configured) |

---

## Common Configuration Scenarios

### Development Environment
```env
NODE_ENV=development
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:5173
CACHE_TTL_MINUTES=5
TRACE_SERVICE_BASE_URL=https://trace.triratnaakolayouth.com
AWS_REGION=eu-north-1
```

### Production Environment
```env
NODE_ENV=production
SERVER_PORT=8080
CORS_ORIGIN=https://yourdomain.com
CACHE_TTL_MINUTES=30
TRACE_SERVICE_BASE_URL=https://trace.production.com
AWS_REGION=eu-north-1
```

### Testing with Local Services
```env
NODE_ENV=test
SERVER_PORT=3001
CORS_ORIGIN=http://localhost:3000
CACHE_TTL_MINUTES=2
TRACE_SERVICE_BASE_URL=http://localhost:9000
AWS_REGION=
```

---

## Performance Tuning

### Cache TTL Adjustment
- **Lower (5 min)**: Faster data refresh, more API calls to trace service
- **Higher (30 min)**: Fewer API calls, potentially stale data
- **Recommended**: 10-15 minutes for balance

```env
# Aggressive caching for stable test results
CACHE_TTL_MINUTES=30

# Frequent refresh for active test runs
CACHE_TTL_MINUTES=5
```

### Server Port for Multiple Instances
Run multiple server instances on different ports:
```bash
# Instance 1
SERVER_PORT=3000 node server.js

# Instance 2
SERVER_PORT=3001 node server.js

# Instance 3
SERVER_PORT=3002 node server.js
```

### CORS Configuration for Multiple Frontends
For multiple frontend origins, update the code to support comma-separated values:
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

Then in `server.js`:
```javascript
const corsOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({ origin: corsOrigins }));
```

---

## Validation & Error Handling

The application includes fallback defaults for all environment variables:

```javascript
// Example from server.js
const SERVER_PORT = process.env.SERVER_PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const CACHE_TTL = (parseInt(process.env.CACHE_TTL_MINUTES) || 10) * 60 * 1000;
```

**If a variable is missing**: The application uses the default value and logs a warning.

### Required vs Optional
- **Required**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- **Optional**: All others (have sensible defaults)

---

## How to Change Configuration

### Method 1: Edit .env file
```bash
# Update .env
CACHE_TTL_MINUTES=20
SERVER_PORT=3001
```

### Method 2: Environment variable override
```bash
# Linux/Mac
export SERVER_PORT=3001
export CACHE_TTL_MINUTES=20
node server.js

# Windows PowerShell
$env:SERVER_PORT = 3001
$env:CACHE_TTL_MINUTES = 20
node server.js

# Windows Command Prompt
set SERVER_PORT=3001
set CACHE_TTL_MINUTES=20
node server.js
```

### Method 3: Command line with dotenv-cli
```bash
npx dotenv -e .env.production node server.js
```

---

## Environment-Specific Files

Create separate .env files for different environments:

```
.env                 # Default (development)
.env.production      # Production settings
.env.test           # Test settings
.env.staging        # Staging settings
```

Update in code:
```javascript
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });
```

Run with specific environment:
```bash
ENV_FILE=.env.production node server.js
```

---

## Logging Configuration Output

The server logs all configuration on startup:
```
Server running at http://localhost:3000
Environment: development
CORS Origin: http://localhost:5173
Cache TTL: 10 minutes
S3 Bucket: sas-migration-result-eveidence
AWS Region: eu-north-1
```

This helps verify all settings are correctly loaded.

---

## Security Best Practices

1. **Never commit .env to version control**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Use strong AWS credentials**
   - Rotate keys regularly
   - Use IAM roles instead of long-term keys when possible

3. **Restrict CORS origin in production**
   ```env
   CORS_ORIGIN=https://yourdomain.com  # Not localhost or wildcard
   ```

4. **Use different credentials per environment**
   ```env
   # .env.development
   AWS_ACCESS_KEY_ID=dev-key-xxx

   # .env.production
   AWS_ACCESS_KEY_ID=prod-key-yyy
   ```

5. **Mask sensitive output in logs**
   ```bash
   # Good: Only show non-sensitive info
   console.log(`AWS Region: ${process.env.AWS_REGION}`);
   
   # Bad: Leaks credentials
   console.log(process.env);
   ```

---

## Summary

✅ All hardcoded values moved to `.env`  
✅ Environment variables with sensible defaults  
✅ Backward compatible (defaults work if .env missing)  
✅ Easy to change per environment  
✅ Security-aware configuration structure  
✅ Proper logging of configuration on startup
