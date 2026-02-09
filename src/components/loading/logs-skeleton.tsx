import { Skeleton } from "@/components/ui/skeleton";

const ROW_WIDTHS = [
  "w-3/4",
  "w-1/2",
  "w-5/6",
  "w-2/3",
  "w-4/5",
  "w-1/3",
  "w-3/5",
  "w-5/6",
  "w-2/5",
  "w-3/4",
  "w-1/2",
  "w-4/5",
];

export function LogsSkeleton() {
  return (
    <div className="space-y-1.5 bg-zinc-950 p-4">
      {ROW_WIDTHS.map((width, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-4 w-20 shrink-0 bg-zinc-800" />
          <Skeleton className={`h-4 ${width} bg-zinc-800`} />
        </div>
      ))}
    </div>
  );
}
