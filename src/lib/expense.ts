export type ExpenseCategory =
  | "FOOD"
  | "UTILITIES"
  | "SALARIES"
  | "MAINTENANCE"
  | "RENT"
  | "SUPPLIES"
  | "MARKETING"
  | "TRANSPORT"
  | "OTHER";

/**
 * Get category label
 */
export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  switch (category) {
    case "FOOD":
      return "Food & Ingredients";
    case "UTILITIES":
      return "Utilities";
    case "SALARIES":
      return "Salaries & Wages";
    case "MAINTENANCE":
      return "Maintenance & Repairs";
    case "RENT":
      return "Rent";
    case "SUPPLIES":
      return "Supplies";
    case "MARKETING":
      return "Marketing";
    case "TRANSPORT":
      return "Transport";
    case "OTHER":
      return "Other";
    default:
      return category;
  }
}

/**
 * Get category color
 */
export function getExpenseCategoryColor(category: ExpenseCategory): string {
  switch (category) {
    case "FOOD":
      return "#10b981"; // green
    case "UTILITIES":
      return "#3b82f6"; // blue
    case "SALARIES":
      return "#8b5cf6"; // purple
    case "MAINTENANCE":
      return "#f59e0b"; // amber
    case "RENT":
      return "#ef4444"; // red
    case "SUPPLIES":
      return "#06b6d4"; // cyan
    case "MARKETING":
      return "#ec4899"; // pink
    case "TRANSPORT":
      return "#6366f1"; // indigo
    case "OTHER":
      return "#6b7280"; // gray
    default:
      return "#6b7280";
  }
}

/**
 * Get all expense categories
 */
export function getAllExpenseCategories(): Array<{
  value: ExpenseCategory;
  label: string;
}> {
  return [
    { value: "FOOD", label: "Food & Ingredients" },
    { value: "UTILITIES", label: "Utilities" },
    { value: "SALARIES", label: "Salaries & Wages" },
    { value: "MAINTENANCE", label: "Maintenance & Repairs" },
    { value: "RENT", label: "Rent" },
    { value: "SUPPLIES", label: "Supplies" },
    { value: "MARKETING", label: "Marketing" },
    { value: "TRANSPORT", label: "Transport" },
    { value: "OTHER", label: "Other" },
  ];
}

/**
 * Calculate monthly total
 */
export function calculateMonthlyTotal(
  expenses: Array<{ amount: number; expenseDate: string | Date }>,
  year: number,
  month: number
): number {
  return expenses
    .filter((expense) => {
      const date = new Date(expense.expenseDate);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Group expenses by category
 */
export function groupExpensesByCategory(
  expenses: Array<{ amount: number; category: ExpenseCategory }>
): Record<ExpenseCategory, number> {
  const grouped: any = {};
  expenses.forEach((expense) => {
    if (!grouped[expense.category]) {
      grouped[expense.category] = 0;
    }
    grouped[expense.category] += expense.amount;
  });
  return grouped;
}

/**
 * Get top category
 */
export function getTopCategory(
  expenses: Array<{ amount: number; category: ExpenseCategory }>
): { category: ExpenseCategory; amount: number } | null {
  const grouped = groupExpensesByCategory(expenses);
  const entries = Object.entries(grouped) as Array<[ExpenseCategory, number]>;
  if (entries.length === 0) return null;

  const top = entries.reduce((max, [category, amount]) =>
    amount > max[1] ? [category, amount] : max
  );

  return { category: top[0], amount: top[1] };
}
