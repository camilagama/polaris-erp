import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
};

const money = (name: string) =>
  numeric(name, {
    precision: 12,
    scale: 2,
  })
    .default("0")
    .notNull();

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "inactive",
]);
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "draft",
  "registered",
  "received",
  "canceled",
]);
export const saleStatusEnum = pgEnum("sale_status", [
  "draft",
  "finalized",
  "canceled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
  "chargeback",
]);
export const paymentEventStatusEnum = pgEnum("payment_event_status", [
  "pending",
  "canceled",
  "confirmed",
]);
export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "pix",
  "cash",
  "card_debit",
  "card_credit",
  "payment_link",
  "bank_transfer",
  "other",
]);
export const paymentEventTypeEnum = pgEnum("payment_event_type", [
  "payment",
  "refund",
  "chargeback",
]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "initial_stock",
  "purchase_in",
  "sale_out",
  "adjustment_plus",
  "adjustment_minus",
  "loss",
  "damage",
  "customer_return",
  "cancel_restock",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 120 }),
  notes: text("notes"),
  status: productStatusEnum("status").default("active").notNull(),
  currentStock: integer("current_stock").default(0).notNull(),
  averageCost: money("average_cost"),
  salePrice: money("sale_price"),
  lastSoldAt: timestamp("last_sold_at"),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  purchaseDate: timestamp("purchase_date")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  quantity: integer("quantity").notNull(),
  supplierAmount: money("supplier_amount"),
  shippingAmount: money("shipping_amount"),
  cardFeeAmount: money("card_fee_amount"),
  otherCostsAmount: money("other_costs_amount"),
  totalCost: money("total_cost"),
  unitCost: money("unit_cost"),
  status: purchaseStatusEnum("status").default("draft").notNull(),
  notes: text("notes"),
  receivedAt: timestamp("received_at"),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleDate: timestamp("sale_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  channel: varchar("channel", { length: 80 }).notNull(),
  status: saleStatusEnum("status").default("finalized").notNull(),
  paymentStatus: paymentStatusEnum("payment_status")
    .default("unpaid")
    .notNull(),
  itemsSubtotal: money("items_subtotal"),
  discountAmount: money("discount_amount"),
  shippingChargedAmount: money("shipping_charged_amount"),
  orderTotal: money("order_total"),
  receivedGrossTotal: money("received_gross_total"),
  receivedNetTotal: money("received_net_total"),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitSalePrice: money("unit_sale_price"),
  lineSubtotal: money("line_subtotal"),
  costSnapshotUnit: money("cost_snapshot_unit"),
  costSnapshotTotal: money("cost_snapshot_total"),
  ...timestamps,
});

export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  dueDate: timestamp("due_date"),
  effectiveDate: timestamp("effective_date"),
  grossAmount: money("gross_amount"),
  feeAmount: money("fee_amount"),
  netAmount: money("net_amount"),
  type: paymentEventTypeEnum("type").default("payment").notNull(),
  method: paymentMethodTypeEnum("method").notNull(),
  status: paymentEventStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  purchaseId: integer("purchase_id").references(() => purchases.id, {
    onDelete: "set null",
  }),
  saleId: integer("sale_id").references(() => sales.id, {
    onDelete: "set null",
  }),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  unitCostSnapshot: money("unit_cost_snapshot"),
  note: text("note"),
  occurredAt: timestamp("occurred_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  targetMarginPercent: money("target_margin_percent"),
  minimumMarginPercent: money("minimum_margin_percent"),
  lowStockThreshold: integer("low_stock_threshold").default(2).notNull(),
  staleProductDays: integer("stale_product_days").default(45).notNull(),
  estimatedFeePercent: money("estimated_fee_percent"),
  ...timestamps,
});
