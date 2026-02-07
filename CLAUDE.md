# Oblik Dashboard

Pipeline monitoring dashboard for Oblik data ingestion.

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Data Fetching:** SWR (with polling intervals)
- **Charts:** Recharts
- **Auth:** NextAuth v5 (Auth.js) with AWS Cognito provider
- **Cloud:** AWS SDK v3 (DynamoDB, Step Functions, CloudWatch, CloudWatch Logs)
- **Deployment:** Vercel
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

## Architecture Notes

- **Pipeline registry** lives in a DynamoDB table (`oblik-pipeline-registry`)
- **Execution history** comes from AWS Step Functions API
- **Metrics** come from CloudWatch (success/failure counts, execution duration)
- **Logs** come from CloudWatch Logs (ECS container logs, Step Functions logs)
- **Auth flow:** NextAuth middleware → Cognito hosted UI → JWT session cookie
- **Multi-tenant:** Cognito user groups (`client:{name}`) filter pipeline visibility
- **Auto-refresh:** SWR polling (30s overview, 15s detail, 5s running executions)
