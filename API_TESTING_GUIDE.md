# API Testing Guide

Use this guide after deploying the backend to verify that every API used by the React UI is reachable.

## API Base URL

```text
https://backend.triratnaakolayouth.com
```

## Before You Start

1. Start with the test-list request below.
2. Copy one `executionId` from its response.
3. Replace `<executionId>` in the remaining URLs and commands.

All backend endpoints use `GET` and do not require a request body.

## 1. Health Check

**URL:** `https://backend.triratnaakolayouth.com/`

Open the URL in a browser or run:

```powershell
Invoke-RestMethod -Uri "https://backend.triratnaakolayouth.com/"
```

**Expected result:** HTTP `200` with:

```json
{ "message": "working" }
```

## 2. Get All Test Executions

**URL:** `https://backend.triratnaakolayouth.com/api/getalltest`

```powershell
Invoke-RestMethod -Uri "https://backend.triratnaakolayouth.com/api/getalltest"
```

**Expected result:** HTTP `200` and a list of test metadata. Copy an `executionId` from this response for the following checks.

## 3. Get Available Trace Names

**URL:** `https://backend.triratnaakolayouth.com/api/avilabletrace/<executionId>`

```powershell
$executionId = "replace-with-a-real-execution-id"
Invoke-RestMethod -Uri "https://backend.triratnaakolayouth.com/api/avilabletrace/$executionId"
```

**Expected result:** HTTP `200` and a response containing `success: true` and a `traces` array.

## 4. Get Failed Trace Viewer Links

**URL:** `https://backend.triratnaakolayouth.com/api/traces/<executionId>`

```powershell
$executionId = "replace-with-a-real-execution-id"
Invoke-RestMethod -Uri "https://backend.triratnaakolayouth.com/api/traces/$executionId"
```

**Expected result:** HTTP `200` and a response containing `success`, `executionId`, `traces`, and `fromCache`.

Run this request twice. The first response should normally contain `"fromCache": false`; the second should contain `"fromCache": true` while the cache entry is still valid.

Trace viewer links returned by this endpoint should use:

```text
https://trace.triratnaakolayouth.com
```

Open one returned link in a browser to verify the trace viewer loads.

## 5. Get Test Result

**URL:** `https://backend.triratnaakolayouth.com/api/getresult/<executionId>`

```powershell
$executionId = "replace-with-a-real-execution-id"
Invoke-RestMethod -Uri "https://backend.triratnaakolayouth.com/api/getresult/$executionId"
```

**Expected result:** HTTP `200` with the stored result for the selected test execution.

## CORS Check for the React UI

The React UI at `https://triratnaakolayouth.com` must receive a successful CORS preflight response from the backend.

```powershell
$response = Invoke-WebRequest `
  -Uri "https://backend.triratnaakolayouth.com/api/getalltest" `
  -Method Options `
  -Headers @{
    Origin = "https://triratnaakolayouth.com"
    "Access-Control-Request-Method" = "GET"
  } `
  -SkipHttpErrorCheck

"Status: $($response.StatusCode)"
"Allowed origin: $($response.Headers['Access-Control-Allow-Origin'])"
```

**Expected result:** status `204` and:

```text
Allowed origin: https://triratnaakolayouth.com
```

## Failure Checks

| Check | Expected result |
| --- | --- |
| Unknown execution ID | The API may return an empty result or HTTP `500`, depending on whether its S3 data exists. |
| Backend is unavailable | Browser or PowerShell shows a connection, DNS, TLS, or HTTP `5xx` error. |
| CORS is incorrect | Browser developer tools reports a CORS error; the preflight command does not show the allowed React UI origin. |
| Trace viewer unavailable | The backend trace endpoint may succeed, but the returned `trace.triratnaakolayouth.com` link will not load. |