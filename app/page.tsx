import { FinanceDashboard } from "@/app/components/FinanceDashboard";
import { getCurrentMonthKey, getDashboardData } from "@/lib/finance/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const month = getCurrentMonthKey();
  const data = await getDashboardData(month);
  const dashboardKey = [
    data.month,
    data.income,
    data.dailyExpenses.length,
    data.monthlyExpenses.map((item) => item.amount).join("-"),
  ].join("|");

  return <FinanceDashboard key={dashboardKey} initialData={data} />;
}
