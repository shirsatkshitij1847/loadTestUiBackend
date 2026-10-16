# Evidence Storage Architecture

## Purpose

Organize test evidence in S3 by project and test execution, with optional database records managed through Prisma.

This is a proposed architecture, not the currently implemented storage layout. Creating this document does not change the application, S3 objects, or database.

For the current layout, see [S3 Storage Structure](./S3_STORAGE_STRUCTURE.md).

## Proposed S3 Hierarchy

The results/evidence bucket can include a project prefix above each execution:

```text
sas-migration-result-eveidence
|
+-- project-a/
|   |
|   +-- testExecution-001/
|   |   +-- result/
|   |   |   +-- worker-1.json
|   |   |   +-- worker-2.json
|   |   |
|   |   +-- trace.zip
|   |
|   +-- testExecution-002/
|       +-- result/
|       |   +-- worker-1.json
|       |
|       +-- trace.zip
|
+-- project-b/
    +-- testExecution-003/
        +-- result/
        |   +-- worker-1.json
        |
        +-- trace.zip
```

The project names, execution IDs, and filenames above are examples.

### Multiple Trace Files

If an execution has multiple traces, use a `traces/` prefix:

```text
<projectId>/<executionId>/
    +-- result/
    |   +-- worker-1.json
    |   +-- worker-2.json
    |
    +-- traces/
        +-- vu001.zip
        +-- vu002.zip
```

Prefer a stable project ID in object keys instead of a project display name. Renaming a project then does not require moving S3 objects.

### Optional Startup Level

If a startup or organization owns multiple projects, add its ID above the project:

```text
sas-migration-result-eveidence
|
+-- <startupId>/
    +-- <projectId>/
        +-- <executionId>/
            +-- result/
            |   +-- worker-1.json
            |
            +-- traces/
                +-- vu001.zip
```

The corresponding prefix patterns are:

```text
<startupId>/<projectId>/<executionId>/result/
<startupId>/<projectId>/<executionId>/traces/
```

Use the startup level only if it represents an actual ownership level in the application.

## How S3 Stores This Structure

S3 stores objects using a bucket and an object key. It does not require filesystem folders to be created first.

For example, uploading an object with:

```text
Bucket: sas-migration-result-eveidence
Key:    project-a/testExecution-001/result/worker-1.json
```

makes the S3 console display:

```text
project-a/
    testExecution-001/
        result/
            worker-1.json
```

The slash-separated portions are key prefixes, not separate directory objects.

The uploader uses the AWS S3 SDK, or an authorized presigned upload flow, to store the actual file. Prisma does not upload files or create S3 prefixes.

## Roles of S3 and Prisma

| Component | Responsibility |
| --- | --- |
| Amazon S3 | Stores result JSON files and trace ZIP artifacts. |
| AWS S3 SDK | Uploads, lists, retrieves, or deletes S3 objects. |
| Database managed through Prisma | Stores project, execution, ownership, and artifact-reference records. |
| Prisma | Queries and updates those database records. |

Prisma is optional for the S3 hierarchy itself. The AWS SDK alone is sufficient to write and read objects using the proposed keys.

Prisma becomes useful when the application needs searchable execution history, project ownership, relationships, and artifact tracking.

## Suggested Database Relationships

The logical database hierarchy can be:

```text
Project
    |
    +-- TestExecution
        |
        +-- Artifact
```

If startups own projects:

```text
Startup
    |
    +-- Project
        |
        +-- TestExecution
            |
            +-- Artifact
```

Suggested information for each record:

| Record | Example fields |
| --- | --- |
| Project | ID, display name, optional startup ID. |
| Test execution | ID, project ID, status, start time, completion time. |
| Artifact | ID, execution ID, type, S3 bucket, S3 object key, upload status. |

An artifact record could reference:

```text
Execution ID:  testExecution-001
Type:          result
Bucket:        sas-migration-result-eveidence
S3 object key: project-a/testExecution-001/result/worker-1.json
```

The actual JSON or ZIP remains in S3. The database stores the information required to locate it.

Store the bucket and object key as the durable reference rather than an expiring presigned URL.

## Proposed Execution and Upload Flow

```text
Client starts a test for a project
    |
    v
Backend validates access to that project
    |
    v
Backend creates an execution record through Prisma
    |
    v
Test workers produce results and traces
    |
    v
Uploader stores files in S3 under the execution prefix
    |
    v
Backend records uploaded artifact references through Prisma
    |
    v
UI requests executions or artifacts for the project
    |
    v
Backend checks access and queries the database
    |
    v
Backend reads S3 objects or issues authorized access URLs
```

### Handling Failures

S3 uploads and database updates are separate operations. A Prisma database transaction does not include S3.

The implementation must handle:

- Failed uploads without marking the artifact as available.
- Successful uploads followed by failed database updates.
- Retries without creating duplicate artifact records.
- Cleanup or reconciliation of orphaned objects and stale records.

S3 prefixes organize data but do not enforce project isolation by themselves. Application authorization and appropriate S3 access policies are still required.

## Changes Required in the Current Application

These are implementation requirements for adopting the proposal, not changes made by this document.

### 1. Update Producers and Uploaders

All systems that write evidence must use the new key convention:

```text
<projectId>/<executionId>/result/<filename>.json
<projectId>/<executionId>/traces/<filename>.zip
```

For a single trace directly under the execution prefix, the key can instead be:

```text
<projectId>/<executionId>/trace.zip
```

Choose a trace convention and use it consistently across uploaders and readers.

### 2. Update Result and Trace Readers

The current readers search under:

```text
<executionId>/
```

With separate result and trace prefixes, they would search under:

```text
Results: <projectId>/<executionId>/result/
Traces:  <projectId>/<executionId>/traces/
```

The project context must come from the request or be resolved from a database execution record.

Relevant readers:

- [s3ResultCreationService.js](./s3ResultCreationService.js)
- [getAllFailedTraces.js](./getAllFailedTraces.js)

### 3. Update API and Trace-Service Integration

The API must identify the project as well as the execution, either explicitly in the route or through a database lookup.

The external trace-viewer service must also be able to resolve the new S3 object keys. Updating the backend listing prefix alone may not be sufficient.

If execution IDs can repeat across projects, cache keys must include project context, not only the execution ID.

Relevant integration files:

- [server.js](./server.js)
- [getFailedTraceViewers.js](./getFailedTraceViewers.js)

### 4. Decide How to Handle Existing Data and Metadata

Existing execution-only prefixes will not automatically move when the code changes. Adoption requires an explicit migration or backward-compatible reading strategy.

The current metadata bucket is separate from the evidence bucket. Adding Prisma does not automatically migrate that metadata. Decide whether the database will replace those documents, reference them, or coexist with them, and define the source of truth.

## Summary

- **Project-based S3 hierarchy:** Fully supported through object keys and prefixes.
- **Creating or uploading files:** Use the AWS S3 SDK or an authorized presigned upload flow.
- **Managing projects, executions, and artifact references:** Prisma with a database is useful but optional.
- **Actual result and trace storage:** Keep the files in S3.
- **Current implementation:** Unchanged; this document describes the proposed architecture.
