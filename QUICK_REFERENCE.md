# Quick Reference - Environment Variables

## Essential Variables to Know

| Variable | Current Value | What It Does |
|----------|---|---|
| `SERVER_PORT` | `3000` | Port the Express server runs on |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend URL allowed to access this API |
| `CACHE_TTL_MINUTES` | `10` | How long to cache trace responses (minutes) |
| `TRACE_SERVICE_BASE_URL` | `https://trace.triratnaakolayouth.com` | URL to trace viewer service |
| `AWS_REGION` | `eu-north-1` | AWS region for S3 |
| `S3_BUCKET_NAME` | `sas-migration-result-eveidence` | S3 bucket with test traces |
| `S3_METADATA_BUCKET` | `sas-metadata-db` | S3 bucket with test metadata |

---

## Quick Commands

### Start Server
```bash
npm start
```

### Development (auto-reload on file changes)
```bash
npm run dev
```

### Change Single Variable (Windows PowerShell)
```powershell
$env:VARIABLE_NAME = "value"
npm start
```

### Change Single Variable (Linux/Mac)
```bash
VARIABLE_NAME=value npm start
```

### Change Multiple Variables (Windows PowerShell)
```powershell
$env:SERVER_PORT = 3001
$env:CORS_ORIGIN = "http://localhost:3000"
$env:CACHE_TTL_MINUTES = 20
npm start
```

### Change Multiple Variables (Linux/Mac)
```bash
SERVER_PORT=3001 CORS_ORIGIN="http://localhost:3000" CACHE_TTL_MINUTES=20 npm start
```

---

## Common Scenarios

### Dev Environment (Default)
```env
NODE_ENV=development
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:5173
CACHE_TTL_MINUTES=10
```
**Command:** `npm start`

### Testing a Slow Network
```powershell
$env:CACHE_TTL_MINUTES = 30
npm start
```
Increases cache to 30 min to reduce API calls.

### Running Multiple Servers
```powershell
# Terminal 1
$env:SERVER_PORT = 3000
npm start

# Terminal 2
$env:SERVER_PORT = 3001
npm start

# Terminal 3
$env:SERVER_PORT = 3002
npm start
```

### Testing with Local Mock Service
```powershell
$env:TRACE_SERVICE_BASE_URL = "http://localhost:9000"
npm start
```

---

## File Configuration Map

| File | Uses These Variables |
|------|---|
| `server.js` | `SERVER_PORT`, `CORS_ORIGIN`, `CACHE_TTL_MINUTES`, `NODE_ENV` |
| `getAllFailedTraces.js` | `AWS_REGION`, `S3_BUCKET_NAME` |
| `getFailedTraceViewers.js` | `TRACE_SERVICE_BASE_URL` |
| `testExecutionMetaData.js` | `AWS_REGION`, `S3_METADATA_BUCKET` |
| `s3ResultCreationService.js` | `S3_BUCKET_NAME`, `AWS_REGION` |

---

## Startup Log Example

```
S3 Bucket: sas-migration-result-eveidence
AWS Region: eu-north-1
Server running at http://localhost:3000
Environment: development
CORS Origin: http://localhost:5173
Cache TTL: 10 minutes
```

**Verify this matches your configuration!**

---

## Performance Tuning

### Fast API Response (Aggressive Caching)
```powershell
$env:CACHE_TTL_MINUTES = 30
npm start
```

### Fresh Data (Frequent Refresh)
```powershell
$env:CACHE_TTL_MINUTES = 2
npm start
```

### Recommended for Production
```powershell
$env:CACHE_TTL_MINUTES = 15
npm start
```

---

## Troubleshooting

### Server won't start on port 3000?
- Port already in use → Change port:
  ```powershell
  $env:SERVER_PORT = 3001
  npm start
  ```

### Frontend can't reach API?
- Wrong CORS origin → Set correct origin:
  ```powershell
  $env:CORS_ORIGIN = "http://your-frontend-url"
  npm start
  ```

### API responses are slow?
- Cache too short → Increase TTL:
  ```powershell
  $env:CACHE_TTL_MINUTES = 20
  npm start
  ```

### Can't find S3 traces?
- Wrong bucket → Update .env:
  ```env
  S3_BUCKET_NAME=your-bucket-name
  ```

---

## All Environment Variables

```env
# Server
NODE_ENV=development
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:5173

# Cache
CACHE_TTL_MINUTES=10

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# S3 Buckets
S3_BUCKET_NAME=
S3_METADATA_BUCKET=
S3_ARTIFACTS_BUCKET=

# Trace Service
TRACE_SERVICE_BASE_URL=

# ECS (for load tests)
ECS_CLUSTER=artilleryfargate_clone_cluster
TASK_DEFINITION=sas_loadtest_cluster_new:3
SUBNET_ID=subnet-04f52bc836a6eebec
SECURITY_GROUP_ID=sg-0111f937374b24eca

# Load Test
LOADTEST_PROJECT_ZIP=loadtest-playwright-project.zip
TEST_EXECUTION_ID=testexecution1234
RUNNER_FILE_NAME=artillery.js
CONTAINER_NAME=Main
USERS=[{"username":"practice","password":"SuperSecretPassword!","vuId":"vu38d000","state":"IN_USE"}]
```

---

**For detailed info, see:** `ENV_CONFIG_GUIDE.md`
