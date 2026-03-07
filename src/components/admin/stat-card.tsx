import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: number | string;
  subtitle?: string;
};

export function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <Card padding="md">
      <p className="text-sm text-muted font-medium">{label}</p>
      <p className="text-2xl font-mono font-bold text-midnight mt-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted mt-1">{subtitle}</p>
      )}
    </Card>
  );
}
