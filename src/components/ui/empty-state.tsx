import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center dark:border-muted">
      {Icon && (
        <Icon className="size-8 text-muted-foreground/60" />
      )}
      <div>
        <p className="font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground/80">
            {description}
          </p>
        )}
      </div>
      {action &&
        (action.href ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : action.onClick ? (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null)}
    </div>
  );
}
