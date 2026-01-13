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

interface VendorAnalyticsData {
  vendorName: string;
  period: string;
  generatedAt: string;
  summary: {
    orders: { count: number; revenue: number };
    products: { activeCount: number };
    coverage: { type: string; locations: number } | null;
  };
  breakdowns: {
    ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
    topProducts: Array<{
      product: { id: string; name: string; price: number; unit: string } | null;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
    }>;
    topCustomers: Array<{
      restaurant: { id: string; name: string; city: string } | null;
      orderCount: number;
      totalRevenue: number;
    }>;
  };
  recent: {
    orders: Array<{
      id: string;
      status: string;
      totalAmount: number;
      createdAt: string;
      restaurant: { name: string; city: string };
    }>;
  };
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const VendorAnalyticsDocument: React.FC<{ data: VendorAnalyticsData }> = ({ data }) => {
  const avgOrderValue =
    data.summary.orders.count > 0
      ? data.summary.orders.revenue / data.summary.orders.count
      : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Vendor Analytics Report</Text>
          <Text style={styles.subtitle}>Marketplace Performance</Text>
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
                {formatCurrency(data.summary.orders.revenue)}
              </Text>
              <Text style={styles.summaryLabel}>{data.summary.orders.count} orders</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Order Value</Text>
              <Text style={styles.summaryValue}>{formatCurrency(avgOrderValue)}</Text>
              <Text style={styles.summaryLabel}>Per order average</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Active Products</Text>
              <Text style={styles.summaryValue}>{data.summary.products.activeCount}</Text>
              <Text style={styles.summaryLabel}>Listed products</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Coverage</Text>
              {data.summary.coverage ? (
                <>
                  <Text style={styles.summaryValue}>{data.summary.coverage.locations}</Text>
                  <Text style={styles.summaryLabel}>
                    {data.summary.coverage.type === "CITY_WIDE" ? "Cities" : "Pincodes"}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.summaryValue}>—</Text>
                  <Text style={styles.summaryLabel}>No coverage set</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orders by Status</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 2 }]}>Status</Text>
              <Text style={styles.tableCol}>Count</Text>
              <Text style={[styles.tableCol, { flex: 1.5 }]}>Revenue</Text>
            </View>
            {data.breakdowns.ordersByStatus.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, { flex: 2 }]}>{item.status}</Text>
                <Text style={styles.tableCol}>{item.count}</Text>
                <Text style={[styles.tableCol, { flex: 1.5 }]}>
                  {formatCurrency(item.revenue)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 2 }]}>Product</Text>
              <Text style={styles.tableCol}>Quantity</Text>
              <Text style={[styles.tableCol, { flex: 1.5 }]}>Revenue</Text>
              <Text style={styles.tableCol}>Orders</Text>
            </View>
            {data.breakdowns.topProducts.slice(0, 10).map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, { flex: 2 }]}>
                  {item.product?.name || "Unknown"}
                </Text>
                <Text style={styles.tableCol}>
                  {item.totalQuantity} {item.product?.unit || ""}
                </Text>
                <Text style={[styles.tableCol, { flex: 1.5 }]}>
                  {formatCurrency(item.totalRevenue)}
                </Text>
                <Text style={styles.tableCol}>{item.orderCount}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 2 }]}>Restaurant</Text>
              <Text style={styles.tableCol}>City</Text>
              <Text style={[styles.tableCol, { flex: 1.5 }]}>Revenue</Text>
              <Text style={styles.tableCol}>Orders</Text>
            </View>
            {data.breakdowns.topCustomers.slice(0, 10).map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, { flex: 2 }]}>
                  {item.restaurant?.name || "Unknown"}
                </Text>
                <Text style={styles.tableCol}>{item.restaurant?.city || "—"}</Text>
                <Text style={[styles.tableCol, { flex: 1.5 }]}>
                  {formatCurrency(item.totalRevenue)}
                </Text>
                <Text style={styles.tableCol}>{item.orderCount}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol}>Order ID</Text>
              <Text style={[styles.tableCol, { flex: 1.5 }]}>Restaurant</Text>
              <Text style={styles.tableCol}>Status</Text>
              <Text style={styles.tableCol}>Amount</Text>
              <Text style={styles.tableCol}>Date</Text>
            </View>
            {data.recent.orders.slice(0, 10).map((order) => (
              <View key={order.id} style={styles.tableRow}>
                <Text style={styles.tableCol}>
                  {order.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={[styles.tableCol, { flex: 1.5 }]}>
                  {order.restaurant.name}
                </Text>
                <Text style={styles.tableCol}>{order.status}</Text>
                <Text style={styles.tableCol}>{formatCurrency(order.totalAmount)}</Text>
                <Text style={styles.tableCol}>
                  {new Date(order.createdAt).toLocaleDateString()}
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
