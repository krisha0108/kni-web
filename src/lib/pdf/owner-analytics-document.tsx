import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts
Font.register({
  family: "Inter",
  src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #e5e7eb",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "1 solid #f3f4f6",
  },
  label: {
    fontSize: 10,
    color: "#6b7280",
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    width: "48%",
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1 solid #f3f4f6",
  },
  tableCol: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTop: "1 solid #e5e7eb",
    paddingTop: 10,
  },
});

interface OwnerAnalyticsData {
  restaurantName: string;
  period: string;
  generatedAt: string;
  summary: {
    bookings: { count: number; revenue: number };
    expenses: { count: number; total: number };
    equipment: { count: number };
    amcSubscriptions: { count: number; value: number };
    marketplaceOrders: { count: number; total: number };
    netRevenue: number;
  };
  breakdowns: {
    bookingsByStatus: Array<{ status: string; count: number }>;
    expensesByCategory: Array<{ category: string; count: number; total: number }>;
    marketplaceOrdersByStatus: Array<{ status: string; count: number }>;
  };
  recent: {
    bookings: Array<{
      id: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }>;
    expenses: Array<{
      id: string;
      amount: number;
      category: string;
      date: string;
      description: string | null;
    }>;
  };
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function OwnerAnalyticsDocument({ data }: { data: OwnerAnalyticsData }) {
  const profitMargin =
    data.summary.bookings.revenue > 0
      ? ((data.summary.netRevenue / data.summary.bookings.revenue) * 100).toFixed(1)
      : "0.0";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics Report</Text>
          <Text style={styles.subtitle}>{data.restaurantName}</Text>
          <Text style={styles.subtitle}>
            Period: {data.period} • Generated: {new Date(data.generatedAt).toLocaleString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.summary.bookings.revenue)}
              </Text>
              <Text style={styles.summaryLabel}>{data.summary.bookings.count} bookings</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
                {formatCurrency(data.summary.expenses.total)}
              </Text>
              <Text style={styles.summaryLabel}>{data.summary.expenses.count} expenses</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net Profit</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: data.summary.netRevenue >= 0 ? "#16a34a" : "#dc2626" },
                ]}
              >
                {formatCurrency(data.summary.netRevenue)}
              </Text>
              <Text style={styles.summaryLabel}>{profitMargin}% margin</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Marketplace Orders</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.summary.marketplaceOrders.total)}
              </Text>
              <Text style={styles.summaryLabel}>
                {data.summary.marketplaceOrders.count} orders
              </Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Active Equipment</Text>
              <Text style={styles.summaryValue}>{data.summary.equipment.count}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>AMC Subscriptions</Text>
              <Text style={styles.summaryValue}>{data.summary.amcSubscriptions.count}</Text>
              <Text style={styles.summaryLabel}>
                {formatCurrency(data.summary.amcSubscriptions.value)} value
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bookings by Status</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 2 }]}>Status</Text>
              <Text style={styles.tableCol}>Count</Text>
            </View>
            {data.breakdowns.bookingsByStatus.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, { flex: 2 }]}>{item.status}</Text>
                <Text style={styles.tableCol}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses by Category</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 2 }]}>Category</Text>
              <Text style={styles.tableCol}>Count</Text>
              <Text style={styles.tableCol}>Total</Text>
            </View>
            {data.breakdowns.expensesByCategory.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, { flex: 2 }]}>{item.category}</Text>
                <Text style={styles.tableCol}>{item.count}</Text>
                <Text style={styles.tableCol}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol}>ID</Text>
              <Text style={styles.tableCol}>Status</Text>
              <Text style={styles.tableCol}>Amount</Text>
              <Text style={styles.tableCol}>Date</Text>
            </View>
            {data.recent.bookings.slice(0, 5).map((booking) => (
              <View key={booking.id} style={styles.tableRow}>
                <Text style={styles.tableCol}>
                  {booking.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.tableCol}>{booking.status}</Text>
                <Text style={styles.tableCol}>{formatCurrency(booking.totalAmount)}</Text>
                <Text style={styles.tableCol}>
                  {new Date(booking.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol}>Category</Text>
              <Text style={[styles.tableCol, { flex: 2 }]}>Description</Text>
              <Text style={styles.tableCol}>Amount</Text>
              <Text style={styles.tableCol}>Date</Text>
            </View>
            {data.recent.expenses.slice(0, 5).map((expense) => (
              <View key={expense.id} style={styles.tableRow}>
                <Text style={styles.tableCol}>{expense.category}</Text>
                <Text style={[styles.tableCol, { flex: 2 }]}>
                  {expense.description || "—"}
                </Text>
                <Text style={styles.tableCol}>{formatCurrency(expense.amount)}</Text>
                <Text style={styles.tableCol}>
                  {new Date(expense.date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by KNI Super App • {new Date().getFullYear()} • Confidential
        </Text>
      </Page>
    </Document>
  );
};
