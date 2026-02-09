import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PipelineDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* PipelineHeader skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* SyncStatePanel skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* StreamTable skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RecentExecutions skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-4 w-10" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
