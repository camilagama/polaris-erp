import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
};

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

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  ...timestamps,
});

export const systemSettings = pgTable(
  "system_settings",
  {
    id: text("id").primaryKey(),
    minimumMarkupPercent: decimal("minimum_markup_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    idealMarkupPercent: decimal("ideal_markup_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    cardFeePercent: decimal("card_fee_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    paymentFeeRules: jsonb("payment_fee_rules")
      .$type<
        Array<{
          code: string;
          feePercent: number;
          installments: number;
          paymentMethod: "card" | "pix";
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (table) => [
    check(
      "system_settings_minimum_markup_percent_non_negative",
      sql`${table.minimumMarkupPercent} >= 0`
    ),
    check(
      "system_settings_ideal_markup_percent_non_negative",
      sql`${table.idealMarkupPercent} >= 0`
    ),
    check(
      "system_settings_card_fee_percent_non_negative",
      sql`${table.cardFeePercent} >= 0`
    ),
  ]
);

export const saleStatusEnum = pgEnum("sale_status", ["completed", "cancelled"]);
export const salePaymentMethodEnum = pgEnum("sale_payment_method", [
  "pix",
  "card",
]);

export const productWriteOffReasonEnum = pgEnum("product_write_off_reason", [
  "adjustment",
  "operational",
]);

export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    purchasedOn: date("purchased_on").default(sql`CURRENT_DATE`).notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
    stock: integer("stock").default(0).notNull(),
    archivedAt: timestamp("archived_at"),
    ...timestamps,
  },
  (table) => [
    check("products_cost_price_non_negative", sql`${table.costPrice} >= 0`),
    check("products_price_non_negative", sql`${table.price} >= 0`),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
    index("products_archived_at_idx").on(table.archivedAt),
    index("products_category_id_idx").on(table.categoryId),
  ]
);

export const productStockEntries = pgTable(
  "product_stock_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    stockedOn: date("stocked_on").default(sql`CURRENT_DATE`).notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    check(
      "product_stock_entries_quantity_positive",
      sql`${table.quantity} > 0`
    ),
    check(
      "product_stock_entries_unit_cost_non_negative",
      sql`${table.unitCost} >= 0`
    ),
    index("product_stock_entries_product_stocked_on_idx").on(
      table.productId,
      table.stockedOn
    ),
  ]
);

export const productStockWriteOffs = pgTable(
  "product_stock_write_offs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    happenedOn: date("happened_on").default(sql`CURRENT_DATE`).notNull(),
    quantity: integer("quantity").notNull(),
    reason: productWriteOffReasonEnum("reason").notNull(),
    notes: text("notes"),
    unitCostSnapshot: decimal("unit_cost_snapshot", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    check(
      "product_stock_write_offs_quantity_positive",
      sql`${table.quantity} > 0`
    ),
    check(
      "product_stock_write_offs_unit_cost_snapshot_non_negative",
      sql`${table.unitCostSnapshot} >= 0`
    ),
    index("product_stock_write_offs_product_happened_on_idx").on(
      table.productId,
      table.happenedOn
    ),
  ]
);

export const sales = pgTable(
  "sales",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    occurredOn: date("occurred_on").default(sql`CURRENT_DATE`).notNull(),
    status: saleStatusEnum("status").default("completed").notNull(),
    paymentMethod: salePaymentMethodEnum("payment_method")
      .default("pix")
      .notNull(),
    paymentInstallments: integer("payment_installments").default(0).notNull(),
    paymentFeePercent: decimal("payment_fee_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    customerName: text("customer_name"),
    notes: text("notes"),
    freightAmount: decimal("freight_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    additionalAmount: decimal("additional_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    feeAmount: decimal("fee_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    cancelledAt: timestamp("cancelled_at"),
    ...timestamps,
  },
  (table) => [
    check(
      "sales_freight_amount_non_negative",
      sql`${table.freightAmount} >= 0`
    ),
    check(
      "sales_additional_amount_non_negative",
      sql`${table.additionalAmount} >= 0`
    ),
    check(
      "sales_discount_amount_non_negative",
      sql`${table.discountAmount} >= 0`
    ),
    check(
      "sales_payment_installments_non_negative",
      sql`${table.paymentInstallments} >= 0`
    ),
    check(
      "sales_payment_fee_percent_non_negative",
      sql`${table.paymentFeePercent} >= 0`
    ),
    check(
      "sales_payment_method_installments_valid",
      sql`(${table.paymentMethod} = 'pix' and ${table.paymentInstallments} = 0) or (${table.paymentMethod} = 'card' and ${table.paymentInstallments} between 1 and 12)`
    ),
    check("sales_fee_amount_non_negative", sql`${table.feeAmount} >= 0`),
    check("sales_total_amount_non_negative", sql`${table.totalAmount} >= 0`),
    index("sales_occurred_on_idx").on(table.occurredOn),
    index("sales_payment_method_idx").on(table.paymentMethod),
    index("sales_status_idx").on(table.status),
  ]
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceSnapshot: decimal("unit_price_snapshot", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    unitCostSnapshot: decimal("unit_cost_snapshot", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lineTotal: decimal("line_total", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    check("sale_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "sale_items_unit_price_snapshot_non_negative",
      sql`${table.unitPriceSnapshot} >= 0`
    ),
    check(
      "sale_items_unit_cost_snapshot_non_negative",
      sql`${table.unitCostSnapshot} >= 0`
    ),
    check("sale_items_line_total_non_negative", sql`${table.lineTotal} >= 0`),
    index("sale_items_sale_id_idx").on(table.saleId),
    index("sale_items_product_id_idx").on(table.productId),
  ]
);
