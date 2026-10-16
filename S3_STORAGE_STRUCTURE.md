# S3 Storage Structure

## Overview

The backend expects test data in two S3 buckets:

1. **Metadata bucket:** JSON documents describing test executions.
2. **Results/evidence bucket:** JSON result files and ZIP trace artifacts grouped by test execution ID.

The same execution ID connects metadata to results and traces. For example:

```text
testExecution-1787214133182
```

This guide describes the structure expected by the backend code, not a live inspection of S3. The repository reads existing S3 objects; the upload logic is not implemented here.

## Bucket Configuration

| Environment variable | Purpose | Current behavior |
| --- | --- | --- |
| `S3_METADATA_BUCKET` | Stores test metadata | Defaults to `sas-metadata-db`. |
| `S3_BUCKET_NAME` | Stores results and trace ZIPs | The trace reader defaults to `sas-migration-result-eveidence`; the result reader requires this variable to be set. |
| `AWS_REGION` | AWS region used by S3 clients | Metadata and trace readers default to `eu-north-1`; the result reader passes the environment value to the AWS SDK. |

Set `S3_BUCKET_NAME` explicitly so result and trace readers use the same bucket.

## Expected Folder Hierarchy

```text
Amazon S3
|
+-- sas-metadata-db
|   |
|   +-- metadata_db/
|       +-- testExecution-1787214133182.json
|       +-- testExecution-1787214139999.json
|
+-- sas-migration-result-eveidence
    |
    +-- testExecution-1787214133182/
    |   +-- <result-file-1>.json
    |   +-- <result-file-2>.json
    |   +-- <trace-file-1>.zip
    |   +-- <trace-file-2>.zip
    |
    +-- testExecution-1787214139999/
        +-- <result-file-1>.json
        +-- <trace-file-1>.zip
```

The bucket names above reflect the defaults used by the metadata and trace readers. Names inside angle brackets are placeholders, not required filenames. The backend does not enforce a worker-based filename convention.

### Metadata Objects

Each execution's metadata is expected at:

```text
Bucket: <S3_METADATA_BUCKET>
Key:    metadata_db/<executionId>.json
```

Example:

```text
metadata_db/testExecution-1787214133182.json
```

The metadata reader parses JSON without enforcing a metadata schema. The exact fields depend on the system that creates and uploads the document.

Implementation: [testExecutionMetaData.js](./testExecutionMetaData.js).

### Result and Trace Objects

Results and traces are expected under the execution prefix:

```text
Bucket: <S3_BUCKET_NAME>
Prefix: <executionId>/
```

Example object keys:

```text
testExecution-1787214133182/<result-file-1>.json
testExecution-1787214133182/<result-file-2>.json
testExecution-1787214133182/<trace-file-1>.zip
```

The readers list all objects under the prefix, including nested keys:

- Objects ending in `.json`, case-insensitively, are read as result documents.
- Objects ending in `.zip`, case-insensitively, are listed as traces.
- No additional worker or virtual-user folder level is required.

Implementations: [s3ResultCreationService.js](./s3ResultCreationService.js) and [getAllFailedTraces.js](./getAllFailedTraces.js).

## How S3 Stores Folders

S3 stores objects using a **bucket** and an **object key**, not filesystem directories.

For example:

```text
Bucket: sas-metadata-db
Key:    metadata_db/testExecution-1787214133182.json
```

Here, `metadata_db/` is a key prefix. The slash makes the S3 console display it like a folder.

Similarly:

```text
Bucket: sas-migration-result-eveidence
Key:    testExecution-1787214133182/<result-file-1>.json
```

The execution ID followed by `/` is the prefix that groups evidence for that test run.

## Data Inside a Result JSON

A result document is expected to contain a `virtualUsers` array. For example:

```json
{
  "virtualUsers": [
    {
      "vuId": "vu001",
      "steps": [
        {
          "name": "Open login page",
          "status": "passed",
          "duration": 1250
        },
        {
          "name": "Submit login",
          "status": "failed",
          "duration": 3200
        }
      ]
    }
  ]
}
```

The logical hierarchy is:

```text
Execution prefix in S3
|
+-- Result JSON object
    |
    +-- virtualUsers[]
        +-- vuId
        +-- steps[]
            +-- name
            +-- status
            +-- duration
```

**Virtual users and steps are nested fields inside JSON, not separate S3 folders.**

## How Metadata and Evidence Are Connected

The shared execution ID connects the two buckets:

```text
Metadata bucket
metadata_db/testExecution-1787214133182.json
                         |
                         | Same execution ID
                         v
Evidence bucket
testExecution-1787214133182/
    +-- <result-file>.json
    +-- <trace-file>.zip
```

This is a naming convention, not a database foreign-key relationship. The backend does not enforce consistency between the two buckets.

## How the APIs Read This Structure

Routes are defined in [server.js](./server.js).

| API | Storage location | Behavior |
| --- | --- | --- |
| `GET /api/getalltest` | Metadata bucket: `metadata_db/` | Lists metadata objects, reads their JSON, and returns an array. |
| `GET /api/getresult/:executionId` | Evidence bucket: `<executionId>/` | Reads JSON objects and combines virtual users and step statistics. |
| `GET /api/avilabletrace/:executionId` | Evidence bucket: `<executionId>/` | Returns ZIP object names relative to the execution prefix. |
| `GET /api/traces/:executionId` | Evidence bucket plus external trace service | Lists ZIPs, requests viewer details for each, and returns the responses. |

`avilabletrace` is the current route spelling.

### Combined Result Response

The result endpoint reads all matching JSON documents and builds:

```text
{
  testExecutionId,
  summary,
  stepSummary,
  virtualUsers
}
```

It calculates file count, virtual-user count, step counts, pass rate, and per-step duration statistics. Steps are grouped by their name. A step is counted as passed only when its status is exactly `passed`; other statuses are counted as failed.

The combined response is calculated on demand and is **not written back to S3**.

Some descriptive summary fields, including worker count, CPU, memory, user, tags, and service, are currently hardcoded in the result service rather than loaded from metadata.

### Trace Viewer Responses

The trace flow lists ZIP objects and calls the external service using:

```text
<TRACE_SERVICE_BASE_URL>/trace/<trace-name>?testExecutionId=<executionId>
```

The helper names mention failed traces, but the S3 listing selects **all ZIP objects** under the execution prefix. It does not filter them by virtual-user failure status.

The main server caches trace viewer responses in memory by execution ID. The default TTL is 10 minutes. This cache is not stored in S3 and is lost when the server restarts.

Implementation: [getFailedTraceViewers.js](./getFailedTraceViewers.js).

## Scope and Current Limitations

- Storage is grouped by execution ID, not by project, user, or date.
- The result and trace readers paginate S3 listings; the metadata listing currently reads only one listing response.
- The backend does not define how producers name or upload individual result and trace files.
- ZIP contents and the external trace service's internal storage layout are not defined in this repository.
- CloudWatch logs are read by the separate [logs-api.js](./logs-api.js), not from this S3 hierarchy.

## Summary

```text
One test execution
    |
    +-- One metadata JSON object:
    |   metadata_db/<executionId>.json
    |
    +-- One evidence prefix:
        <executionId>/
            +-- Result JSON files containing virtual users and steps
            +-- Trace ZIP files
```
