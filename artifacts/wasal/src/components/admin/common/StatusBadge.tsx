import { statusColors, statusLabels } from "@/types/admin.types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusColors[status] || "bg-muted text-muted-foreground", className)}>
      {statusLabels[status] || status}
    </span>
  );
};

export default StatusBadge;
