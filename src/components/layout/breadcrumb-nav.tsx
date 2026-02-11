"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function BreadcrumbNav() {
  const pathname = usePathname();

  // /admin/users → User Management
  if (pathname === "/admin/users") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>User Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /pipelines/[id]/executions/[executionId] → Pipelines > id > Executions > executionId
  const executionDetailMatch = pathname.match(
    /^\/pipelines\/([^/]+)\/executions\/([^/]+)$/
  );

  if (executionDetailMatch) {
    const pipelineId = decodeURIComponent(executionDetailMatch[1]);
    const executionId = decodeURIComponent(executionDetailMatch[2]);
    const truncatedId =
      executionId.length > 24
        ? executionId.slice(0, 12) + "..." + executionId.slice(-8)
        : executionId;

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${encodeURIComponent(pipelineId)}`}>
                {pipelineId}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                href={`/pipelines/${encodeURIComponent(pipelineId)}/executions`}
              >
                Executions
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage title={executionId}>{truncatedId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /pipelines/[id]/executions → ["Pipelines", decoded id, "Executions"]
  const executionsMatch = pathname.match(
    /^\/pipelines\/([^/]+)\/executions$/
  );

  if (executionsMatch) {
    const pipelineId = decodeURIComponent(executionsMatch[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${encodeURIComponent(pipelineId)}`}>
                {pipelineId}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Executions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /pipelines/[id]/metrics → Pipelines > id > Metrics
  const metricsMatch = pathname.match(
    /^\/pipelines\/([^/]+)\/metrics$/
  );

  if (metricsMatch) {
    const pipelineId = decodeURIComponent(metricsMatch[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${encodeURIComponent(pipelineId)}`}>
                {pipelineId}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Metrics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /pipelines/[id]/logs → Pipelines > id > Logs
  const logsMatch = pathname.match(
    /^\/pipelines\/([^/]+)\/logs$/
  );

  if (logsMatch) {
    const pipelineId = decodeURIComponent(logsMatch[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${encodeURIComponent(pipelineId)}`}>
                {pipelineId}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Logs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /pipelines/[id]/streams → Pipelines > id > Streams
  const streamsMatch = pathname.match(
    /^\/pipelines\/([^/]+)\/streams$/
  );

  if (streamsMatch) {
    const pipelineId = decodeURIComponent(streamsMatch[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${encodeURIComponent(pipelineId)}`}>
                {pipelineId}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Streams</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /pipelines/[id] → ["Pipelines", decoded id]
  const pipelineMatch = pathname.match(/^\/pipelines\/([^/]+)/)

  if (pipelineMatch) {
    const pipelineId = decodeURIComponent(pipelineMatch[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pipelineId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Default: root "/"
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Pipelines</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
