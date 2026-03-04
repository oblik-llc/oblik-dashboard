# Design: Execution-Scoped Log Filtering (Issue #47)

**Date:** 2026-03-03
**Branch:** `feat/issue-47-execution-log-filter`

## Problem

The "View Logs for this Execution" link on the pipeline execution detail page passes only `startTime` + `endTime` to the logs viewer. CloudWatch `FilterLogEventsCommand` then returns events from every execution that ran during that window. On frequent pipelines (hourly), this makes per-execution debugging unreliable.

## Key Findings from CloudWatch

**SFN logs:** Every log entry is structured JSON with `execution_arn` as a top-level field. Log streams are hourly time buckets shared across all executions. Reliable filter: `{ $.execution_arn = "arn:..." }`.

**ECS logs:** Plain text, no execution name or ARN in the content. Each ECS task run gets its own log stream named `ecs/{containerName}/{taskId}`. The ECS task ARN (and container name) is available in the SFN execution history's `TaskSucceeded` event for the `runTask.sync` step.

## Approach

Per-source execution scoping:
- **SFN:** CloudWatch JSON filter pattern on `execution_arn`
- **ECS:** Target the exact log stream for that task using `logStreamNames`

Both sources are fully isolated. If ECS task never launched (early failure), degrade gracefully to time-window-only with a banner note.

## Data Flow

### 1. Execution Detail API (`/api/pipelines/[pipelineId]/executions/[executionId]`)

Parse the SFN execution history to extract:
- The `TaskSucceeded` event where `resourceType === "ecs"`
- From its `output` JSON: `Tasks[0].TaskArn` → task ID (last path segment), `Containers[0].Name` → container name
- Derive `ecsTaskLogStream = "ecs/{containerName}/{taskId}"`

Add to `ExecutionDetailResponse`:
```ts
ecsTaskLogStream: string | null;  // null if ECS task never launched
```

### 2. Execution Detail Page (`/pipelines/[pipelineId]/executions/[executionId]/page.tsx`)

Update the "View Logs" link to pass:
```
/pipelines/{pipelineId}/logs?startTime=...&endTime=...&executionArn=...&ecsTaskLogStream=...
```

### 3. `use-logs.ts`

Add optional fields to `UseLogsOptions`:
```ts
executionArn?: string;
ecsTaskLogStream?: string;
```
Forward as query params to the API route.

### 4. Logs API Route (`/api/pipelines/[pipelineId]/logs`)

When execution-scoping params are present:
- **SFN source + `executionArn`:** Set `filterPattern: '{ $.execution_arn = "<executionArn>" }'`. If the user also provided a text filter, append it: `{ $.execution_arn = "..." && $.message = "*userFilter*" }` (or fall back to two separate filters if AND-ing proves complex).
- **ECS source + `ecsTaskLogStream`:** Set `logStreamNames: [ecsTaskLogStream]`. Pass user filter as `filterPattern` normally.

### 5. Logs Page (`/pipelines/[pipelineId]/logs/page.tsx`)

Read `executionArn` and `ecsTaskLogStream` from `searchParams`.

- Show a banner when scoped: `"Showing logs for execution {executionName}"` (derive name from ARN last segment)
- If `ecsTaskLogStream` is absent but `executionArn` is present and source is ECS: banner says `"ECS logs may include other concurrent runs (task did not complete)"`
- Log source toggle still works; switching sources applies the appropriate scoping for that source

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| ECS task never launched (pre-ECS failure) | `ecsTaskLogStream: null`; ECS tab shows time-window logs + warning banner |
| Running execution (no `stopDate`) | `endTime` defaults to `new Date().toISOString()`, same as today |
| User navigates to logs page directly (no execution params) | No execution filter; time-window only; no banner |
| User applies text filter on top of execution filter | AND-ed server-side; ECS scoping still uses `logStreamNames` |

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types/api.ts` | Add `ecsTaskLogStream: string \| null` to `ExecutionDetailResponse` |
| `src/app/api/pipelines/[pipelineId]/executions/[executionId]/route.ts` | Parse ECS task log stream from SFN history |
| `src/app/pipelines/[pipelineId]/executions/[executionId]/page.tsx` | Add `executionArn` + `ecsTaskLogStream` to "View Logs" link |
| `src/hooks/use-logs.ts` | Add `executionArn?` + `ecsTaskLogStream?` to `UseLogsOptions` |
| `src/app/api/pipelines/[pipelineId]/logs/route.ts` | Build `filterPattern` / `logStreamNames` from execution params |
| `src/app/pipelines/[pipelineId]/logs/page.tsx` | Read execution params, show scoping banner |
