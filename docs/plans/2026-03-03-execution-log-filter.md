# Execution-Scoped Log Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the log viewer so "View Logs for this Execution" shows only logs from the selected execution, not all runs in that time window.

**Architecture:** Thread `executionArn` and `ecsTaskLogStream` from the execution detail page through to the CloudWatch API. For SFN logs, use a JSON filter pattern on `execution_arn`. For ECS logs, target the exact log stream for that ECS task (each task run gets its own stream named `ecs/{containerName}/{taskId}`). The ECS task log stream is derived from SFN execution history on the server.

**Tech Stack:** Next.js App Router, AWS SDK v3 (`@aws-sdk/client-stepfunctions`, `@aws-sdk/client-cloudwatch-logs`), SWR, TypeScript, Tailwind, shadcn/ui

**Design doc:** `docs/plans/2026-03-03-execution-log-filter-design.md`

---

### Task 1: Extend type definitions

**Files:**
- Modify: `src/lib/types/api.ts`
- Modify: `src/lib/types/pipeline.ts`

**Step 1: Add `ecsTaskLogStream` to `ExecutionDetailResponse` in `src/lib/types/api.ts`**

Find `ExecutionDetailResponse` (line ~96) and add one field:

```ts
export interface ExecutionDetailResponse {
  executionArn: string;
  name: string;
  status: string;
  startDate: string;
  stopDate: string | null;
  input: string | null;
  output: string | null;
  error: string | null;
  cause: string | null;
  stateMachineArn: string;
  history: ExecutionHistoryEventResponse[];
  ecsTaskLogStream: string | null; // "ecs/{containerName}/{taskId}" or null
}
```

**Step 2: Add `ecsTaskLogStream` to `ExecutionDetailWithHistory` in `src/lib/types/pipeline.ts`**

Find `ExecutionDetailWithHistory` and add the field:

```ts
export interface ExecutionDetailWithHistory {
  detail: ExecutionDetail;
  history: ExecutionHistoryEvent[];
  ecsTaskLogStream: string | null;
}
```

If `ExecutionDetailWithHistory` doesn't exist as an explicit interface (may be inferred), add it explicitly. Check `src/lib/types/pipeline.ts` first.

**Step 3: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add src/lib/types/api.ts src/lib/types/pipeline.ts
git commit -m "feat(types): add ecsTaskLogStream to execution detail response"
```

---

### Task 2: Extract ECS task log stream in `getExecutionDetail`

**Files:**
- Modify: `src/lib/aws/stepfunctions.ts`

**Background:** The raw SFN execution history includes a `TaskSucceeded` event where `taskSucceededEventDetails.resourceType === "ecs"`. Its `output` JSON contains `Containers[0].Name` (e.g. `"shopify-connector"`) and `Containers[0].TaskArn` (e.g. `"arn:aws:ecs:us-west-1:...:task/cluster/03fab466f5954d71a7b0e1803d0367f2"`). The log stream is `ecs/{name}/{taskId}` where `taskId` is the last `/`-delimited segment of `TaskArn`.

**Step 1: Add helper function `extractEcsTaskLogStream` to `src/lib/aws/stepfunctions.ts`**

Add this function (before or after `flattenHistoryEvent`):

```ts
function extractEcsTaskLogStream(
  events: HistoryEvent[]
): string | null {
  for (const ev of events) {
    const det = ev.taskSucceededEventDetails;
    if (det?.resourceType !== "ecs" || !det.output) continue;
    try {
      const out = JSON.parse(det.output) as {
        Containers?: Array<{ Name?: string; TaskArn?: string }>;
      };
      const container = out.Containers?.[0];
      if (!container?.Name || !container?.TaskArn) continue;
      const taskId = container.TaskArn.split("/").pop();
      if (!taskId) continue;
      return `ecs/${container.Name}/${taskId}`;
    } catch {
      // malformed output — skip
    }
  }
  return null;
}
```

**Step 2: Update `getExecutionDetail` to return `ecsTaskLogStream`**

In the `getExecutionDetail` function, after building `history`, add:

```ts
const ecsTaskLogStream = extractEcsTaskLogStream(
  historyResult.events ?? []
);

return { detail, history, ecsTaskLogStream };
```

The return type `ExecutionDetailWithHistory` already has this field from Task 1.

**Step 3: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add src/lib/aws/stepfunctions.ts
git commit -m "feat(sfn): extract ECS task log stream from execution history"
```

---

### Task 3: Pass `ecsTaskLogStream` through the execution detail API route

**Files:**
- Modify: `src/app/api/pipelines/[pipelineId]/executions/[executionId]/route.ts`

**Step 1: Update `serializeDetail` to include `ecsTaskLogStream`**

`serializeDetail` currently returns `Omit<ExecutionDetailResponse, "history">`. It doesn't know about `ecsTaskLogStream` — that comes from history. Update the route to pass it in separately.

Replace the response body construction in the `GET` handler:

```ts
// 6. Fetch execution detail + history
const { detail, history, ecsTaskLogStream } = await getExecutionDetail(executionArn);

// 7. Build response
const body: ExecutionDetailResponse = {
  ...serializeDetail(detail),
  history: history.map(serializeHistoryEvent),
  ecsTaskLogStream,
};
```

`serializeDetail` signature doesn't need to change — `ecsTaskLogStream` is added at the call site.

**Step 2: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 3: Commit**

```bash
git add src/app/api/pipelines/[pipelineId]/executions/[executionId]/route.ts
git commit -m "feat(api): include ecsTaskLogStream in execution detail response"
```

---

### Task 4: Update `use-logs.ts` to accept execution-scoping params

**Files:**
- Modify: `src/hooks/use-logs.ts`

**Step 1: Add optional fields to `UseLogsOptions`**

```ts
export interface UseLogsOptions {
  pipelineId: string;
  logSource: LogSource;
  startTime: string | null;
  endTime: string | null;
  filter?: string;
  nextToken?: string;
  executionArn?: string;       // scopes SFN logs to this execution
  ecsTaskLogStream?: string;   // scopes ECS logs to this log stream
}
```

**Step 2: Forward them as query params**

In `useLogs`, after the existing params, add:

```ts
if (executionArn) params.set("executionArn", executionArn);
if (ecsTaskLogStream) params.set("ecsTaskLogStream", ecsTaskLogStream);
```

Also destructure the new fields at the top of `useLogs`:

```ts
export function useLogs({
  pipelineId,
  logSource,
  startTime,
  endTime,
  filter,
  nextToken,
  executionArn,
  ecsTaskLogStream,
}: UseLogsOptions) {
```

**Step 3: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add src/hooks/use-logs.ts
git commit -m "feat(hooks): add execution-scoping params to use-logs"
```

---

### Task 5: Apply execution scoping in the logs API route

**Files:**
- Modify: `src/app/api/pipelines/[pipelineId]/logs/route.ts`

**Step 1: Parse the new query params**

After `const filter = url.searchParams.get("filter") || undefined;`, add:

```ts
const executionArn = url.searchParams.get("executionArn") || undefined;
const ecsTaskLogStream = url.searchParams.get("ecsTaskLogStream") || undefined;
```

**Step 2: Build execution-scoped `filterPattern` and `logStreamNames`**

Replace the `getLogs(...)` call (step 8) with this logic:

```ts
// 8. Build execution-scoping options
let resolvedFilterPattern: string | undefined = filter;
let logStreamNames: string[] | undefined;

if (logGroup === "sfn" && executionArn) {
  // SFN logs: every entry has execution_arn as a JSON field
  resolvedFilterPattern = `{ $.execution_arn = "${executionArn}" }`;
  // user text filter is not applied when execution-scoped (CloudWatch
  // JSON filter patterns can't be combined with plain text patterns)
} else if (logGroup === "ecs" && ecsTaskLogStream) {
  // ECS logs: scope to the specific task's log stream; user filter still applies
  logStreamNames = [ecsTaskLogStream];
}

// 9. Fetch logs
const result = await getLogs(
  logGroupName,
  startTime,
  endTime,
  resolvedFilterPattern,
  nextToken,
  limit,
  logStreamNames
);
```

**Step 3: Update `getLogs` signature to accept `logStreamNames`**

In `src/lib/aws/logs.ts`, add an optional `logStreamNames` parameter:

```ts
export async function getLogs(
  logGroup: string,
  startTime: number,
  endTime: number,
  filterPattern?: string,
  nextToken?: string,
  limit: number = 100,
  logStreamNames?: string[]
): Promise<LogQueryResult> {
  const client = getCloudWatchLogsClient();

  try {
    const result = await client.send(
      new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime,
        endTime,
        filterPattern,
        nextToken,
        limit,
        ...(logStreamNames && { logStreamNames }),
      })
    );
    // rest unchanged
```

**Step 4: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 5: Commit**

```bash
git add src/app/api/pipelines/[pipelineId]/logs/route.ts src/lib/aws/logs.ts
git commit -m "feat(api): scope log queries to execution via filterPattern and logStreamNames"
```

---

### Task 6: Update the execution detail page to pass execution params in the logs link

**Files:**
- Modify: `src/app/pipelines/[pipelineId]/executions/[executionId]/page.tsx`

**Step 1: Update the `ExecutionDetailResponse` usage**

The page uses `useExecutionDetail` which returns `execution` typed as `ExecutionDetailResponse`. The new `ecsTaskLogStream` field is now available on `execution`.

**Step 2: Update the "View Logs" link (line ~259)**

Replace:

```tsx
href={`/pipelines/${encodeURIComponent(pipelineId)}/logs?startTime=${encodeURIComponent(execution.startDate)}&endTime=${encodeURIComponent(execution.stopDate || new Date().toISOString())}`}
```

With:

```tsx
href={(() => {
  const p = new URLSearchParams({
    startTime: execution.startDate,
    endTime: execution.stopDate || new Date().toISOString(),
    executionArn: execution.executionArn,
  });
  if (execution.ecsTaskLogStream) {
    p.set("ecsTaskLogStream", execution.ecsTaskLogStream);
  }
  return `/pipelines/${encodeURIComponent(pipelineId)}/logs?${p.toString()}`;
})()}
```

**Step 3: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add src/app/pipelines/[pipelineId]/executions/[executionId]/page.tsx
git commit -m "feat(ui): pass executionArn and ecsTaskLogStream to logs link"
```

---

### Task 7: Show execution-scoping banner on the logs page

**Files:**
- Modify: `src/app/pipelines/[pipelineId]/logs/page.tsx`

**Step 1: Read execution params from `searchParams`**

After the existing `const qStart = searchParams.get("startTime");` block, add:

```ts
const qExecutionArn = searchParams.get("executionArn") || undefined;
const qEcsTaskLogStream = searchParams.get("ecsTaskLogStream") || undefined;

// Derive execution name from ARN (last segment) for display
const executionName = qExecutionArn
  ? qExecutionArn.split(":").pop()
  : undefined;
```

**Step 2: Pass execution params to `useLogs`**

Update the `useLogs` call:

```ts
const { data, isLoading, error, mutate } = useLogs({
  pipelineId,
  logSource,
  startTime,
  endTime,
  filter: activeFilter,
  nextToken: currentToken,
  executionArn: qExecutionArn,
  ecsTaskLogStream: qEcsTaskLogStream,
});
```

**Step 3: Add execution-scoping banner**

Add this block after the existing time range / active filter badges (after line ~220):

```tsx
{executionName && (
  <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950">
    <FileText className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
    <span className="text-blue-800 dark:text-blue-200">
      Filtered to execution{" "}
      <span className="font-mono font-medium">{executionName}</span>
    </span>
    {logSource === "ecs" && !qEcsTaskLogStream && (
      <span className="ml-1 text-blue-600 dark:text-blue-400">
        · ECS logs may include other concurrent runs (task did not complete)
      </span>
    )}
  </div>
)}
```

`FileText` is already imported in this file.

**Step 4: Reset accumulated logs when execution params change**

Add `qExecutionArn` and `qEcsTaskLogStream` to the dependency arrays in `handleSourceChange` and the existing reset logic. Specifically, reset accumulated state when log source changes (already done in `handleSourceChange`). The execution params are read-only from the URL, so no reset needed for them.

**Step 5: Verify no TypeScript errors**

```bash
npm run lint
```

**Step 6: Commit**

```bash
git add src/app/pipelines/[pipelineId]/logs/page.tsx
git commit -m "feat(ui): show execution-scoping banner on logs page"
```

---

### Task 8: Manual end-to-end verification

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Navigate to a pipeline with frequent runs**

Go to `http://localhost:3000`, pick a pipeline (e.g. Flooret / Shopify), click into Executions, pick a completed execution.

**Step 3: Verify the "View Logs" link includes execution params**

Hover over the "View Logs for this Execution" link — confirm the URL contains `executionArn=` and `ecsTaskLogStream=` (if the execution had an ECS task).

**Step 4: Click the link and verify**

- Banner appears: "Filtered to execution `<uuid>`"
- Switch to SFN tab — verify only events for that execution appear (check timestamps vs. adjacent hourly executions)
- Switch to ECS tab — verify only that task's container logs appear

**Step 5: Navigate to the logs page directly (no execution params)**

Go to `/pipelines/{pipelineId}/logs` without query params — no banner should appear, time-window defaults apply.

**Step 6: Final lint check**

```bash
npm run lint
```

**Step 7: Check `ExecutionDetailWithHistory` type in `src/lib/types/pipeline.ts`**

If that interface wasn't already defined explicitly, ensure it compiles cleanly.

---

### Task 9: Open PR

```bash
git push -u origin feat/issue-47-execution-log-filter
gh pr create \
  --title "Fix log viewer to show only selected execution's logs (#47)" \
  --body "$(cat <<'EOF'
## Summary

- Adds `ecsTaskLogStream` to the execution detail API response, derived from the SFN history's ECS `runTask.sync` success event
- Threads `executionArn` and `ecsTaskLogStream` from the execution detail page into the logs page URL
- For SFN logs: scopes CloudWatch query via `{ $.execution_arn = "..." }` filter pattern
- For ECS logs: scopes CloudWatch query to the exact log stream via `logStreamNames`
- Shows a banner on the logs page when viewing execution-scoped logs

## Test plan

- [ ] Open an execution detail page and verify the "View Logs" link includes `executionArn` and `ecsTaskLogStream` params
- [ ] Click the link — confirm banner appears and SFN/ECS logs are scoped to that execution
- [ ] Navigate to logs page directly (no params) — confirm no banner and normal time-window behavior
- [ ] Test an execution that failed before ECS launched — confirm `ecsTaskLogStream` is absent and ECS tab shows warning note in banner

Closes #47

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
