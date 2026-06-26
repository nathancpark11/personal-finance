export type DashboardUser = {
  id: number;
  name: string;
  email: string;
};

export type DailyExpenseItem = {
  id: number;
  amount: number;
  category: string;
  note: string | null;
  dateAdded: string;
  createdBy: number;
  createdByName: string;
};

export type MonthlyExpenseItem = {
  id: number;
  name: string;
  amount: number;
  sortOrder: number;
};

export type DashboardData = {
  householdId: number;
  month: string;
  users: DashboardUser[];
  income: number;
  monthlyExpenses: MonthlyExpenseItem[];
  dailyExpenses: DailyExpenseItem[];
  totals: {
    necessityExpenses: number;
    dailyExpenses: number;
    remainingToSpend: number;
  };
};
