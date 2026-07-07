import { formatCurrency, formatMinutes } from "@/lib/format";

export function ProjectBudgetBar({
  usedMinutes,
  budgetHours,
  usedAmount,
  budgetAmount,
  showAmount,
}: {
  usedMinutes: number;
  budgetHours: number | null;
  usedAmount: number;
  budgetAmount: number | null;
  showAmount: boolean;
}) {
  if (!budgetHours && !budgetAmount) {
    return <p className="text-sm text-muted-foreground">No budget set for this project.</p>;
  }

  const hoursPct = budgetHours ? Math.min(100, (usedMinutes / 60 / budgetHours) * 100) : null;
  const amountPct = budgetAmount ? Math.min(100, (usedAmount / budgetAmount) * 100) : null;
  const pct = hoursPct ?? amountPct ?? 0;
  const over = (hoursPct !== null && hoursPct >= 100) || (amountPct !== null && amountPct >= 100);
  const near = !over && ((hoursPct !== null && hoursPct >= 85) || (amountPct !== null && amountPct >= 85));

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${over ? "bg-destructive" : near ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
        {budgetHours && (
          <span>
            {formatMinutes(usedMinutes)} / {budgetHours}h budgeted
          </span>
        )}
        {budgetAmount && showAmount && (
          <span>
            {formatCurrency(usedAmount)} / {formatCurrency(budgetAmount)} budgeted
          </span>
        )}
      </div>
    </div>
  );
}
