# Oblik Dashboard

Pipeline monitoring dashboard for Oblik data ingestion.

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Data Fetching:** SWR (with polling intervals)
- **Charts:** Recharts
- **Auth:** NextAuth v5 (Auth.js) with AWS Cognito provider
- **Cloud:** AWS SDK v3 (DynamoDB, Step Functions, CloudWatch, CloudWatch Logs, SNS)
- **Deployment:** AWS Amplify Hosting
- **Icons:** lucide-react
- **Dates:** date-fns

## Project Structure

```
src/
  app/                          # Next.js App Router pages
    api/                        # API route handlers
      auth/[...nextauth]/       # NextAuth endpoints
      pipelines/                # Pipeline API routes
  components/                   # React components
    layout/                     # Sidebar, Header, etc.
    metrics/                    # Chart components
  hooks/                        # Custom React hooks (SWR wrappers)
  lib/
    auth/                       # NextAuth configuration
    aws/                        # AWS SDK clients and query functions
    types/                      # TypeScript interfaces
```

## Commands

- `npm run dev` — Start dev server on localhost:3000
- `npm run build` — Production build
- `npm run lint` — Run ESLint

## Environment Variables

See `.env.local.example` for all required variables. Key ones:
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET`
- `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` / `COGNITO_ISSUER`

## Git Workflow

- When starting work on a new GitHub issue, always create a feature branch first (e.g., `feat/issue-12-pipeline-detail`) and open a PR against `main` when done.
- Do not commit directly to `main` for issue work.

## Frontend Design

- Always use the `/frontend-design` skill when building or modifying UI components and pages. This ensures consistent, high-quality design across the dashboard.

## Shared Utilities (`src/lib/`)

- **`format.ts`** — Duration formatting (`formatDurationMs`, `formatYAxisDuration`). Use these instead of defining local formatters in chart components.
- **`stats.ts`** — `percentile()` with linear interpolation.
- **`csv.ts`** — `downloadCsv()` for client-side CSV export with comma/quote escaping.

## Recharts Gotchas

- The `Legend` component does **not** accept a `payload` prop in the version used here. Use a custom HTML legend (e.g., inline `<span>` elements) instead of passing custom `payload` to `<Legend>`.
- Tooltip `formatter` signature: use `(value?: number | string)` — the `name` param can be `undefined`, so avoid typing it as `string`.

## Architecture Notes

- **Pipeline registry** lives in a DynamoDB table (`oblik-pipeline-registry`)
- **Execution history** comes from AWS Step Functions API
- **Metrics** come from CloudWatch (success/failure counts, execution duration)
- **Logs** come from CloudWatch Logs (ECS container logs, Step Functions logs)
- **Auth flow:** NextAuth middleware → Cognito hosted UI → JWT session cookie
- **Multi-tenant:** Cognito user groups (`client:{name}`) filter pipeline visibility
- **Auto-refresh:** SWR polling (30s overview, 15s detail, 5s running executions)
- **Admin authorization:** Explicit `"Admin"` Cognito group check via `isAdmin()` in `src/lib/api/helpers.ts`. Used for write actions (not the implicit "no client groups" pattern used for read filtering).
- **Write-action API pattern:** Auth → admin check (403) → fetch resource (404) → multi-tenant check (404) → business logic guards (400/409) → rate limit (429) → execute → return 201. See `trigger/route.ts` as reference.
- **Manual trigger:** Embeds audit info (`triggeredBy`, `triggeredAt`, `source`) in SFN execution input. Execution name format: `manual-{timestamp}-{uuid8}`.
- **Alerting:** DynamoDB tables `oblik-alert-preferences` (per-pipeline config) and `oblik-alert-history` (with 90-day TTL). Delivers via SNS email and Slack webhooks. Evaluation logic in `alerts-evaluate.ts` handles failure, consecutive failures, and recovery detection with 5-min rate limiting.
- **API key auth pattern:** For endpoints called by AWS services (not users), use `x-api-key` header auth instead of Cognito. Add the path to `middleware.ts` matcher exclusion list (e.g., `api/alerts/evaluate`).
