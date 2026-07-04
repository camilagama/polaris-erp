import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const tz = { withTimezone: true } as const;

export const timestamps = {
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz)
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
};

// ---------------------------------------------------------------------------
// Auth tables (Better Auth managed – IDs kept as TEXT)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").notNull(),
    expiresAt: timestamp("expires_at", tz).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id").references(
      () => organization.id,
      { onDelete: "set null" }
    ),
    ...timestamps,
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_active_organization_id_idx").on(table.activeOrganizationId),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", tz),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", tz),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)]
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", tz).notNull(),
  ...timestamps,
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("operator").notNull(),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("member_organization_id_idx").on(table.organizationId),
    index("member_user_id_idx").on(table.userId),
    uniqueIndex("member_organization_user_unique_idx").on(
      table.organizationId,
      table.userId
    ),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", tz),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("invitation_organization_id_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
    index("invitation_status_idx").on(table.status),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("audit_events_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("audit_events_actor_user_id_idx").on(table.actorUserId),
  ]
);

// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------

export const saleStatusEnum = pgEnum("sale_status", ["completed", "cancelled"]);
export const salePaymentMethodEnum = pgEnum("sale_payment_method", [
  "pix",
  "card",
]);
export const salePaymentFeePayerEnum = pgEnum("sale_payment_fee_payer", [
  "not_applicable",
  "seller",
  "customer",
]);

export const productWriteOffReasonEnum = pgEnum("product_write_off_reason", [
  "adjustment",
  "operational",
]);

export const goalMetricEnum = pgEnum("goal_metric", [
  "revenue",
  "profit",
  "sales_count",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "expired",
  "archived",
]);

export const goalDisplayModeEnum = pgEnum("goal_display_mode", [
  "percentage",
  "absolute",
]);

// ---------------------------------------------------------------------------
// Domain tables (IDs as native UUID, timestamps with timezone)
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_organization_key_unique_idx").on(
      table.organizationId,
      table.key
    ),
    uniqueIndex("categories_organization_name_unique_idx").on(
      table.organizationId,
      table.name
    ),
    uniqueIndex("categories_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
  ]
);

export const systemSettings = pgTable(
  "system_settings",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
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
    paymentFeeRules: jsonb("payment_fee_rules")
      .$type<
        Array<{
          installments: number;
          feePercent: number;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.id],
      name: "system_settings_organization_id_id_pk",
    }),
    check(
      "system_settings_minimum_markup_percent_non_negative",
      sql`${table.minimumMarkupPercent} >= 0`
    ),
    check(
      "system_settings_ideal_markup_percent_non_negative",
      sql`${table.idealMarkupPercent} >= 0`
    ),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    purchasedOn: date("purchased_on").default(sql`CURRENT_DATE`).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
    stock: integer("stock").default(0).notNull(),
    imageVersion: integer("image_version"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    imageBlurDataUrl: text("image_blur_data_url"),
    imageUploadedAt: timestamp("image_uploaded_at", tz),
    archivedAt: timestamp("archived_at", tz),
    ...timestamps,
  },
  (table) => [
    check("products_cost_price_non_negative", sql`${table.costPrice} >= 0`),
    check("products_price_non_negative", sql`${table.price} >= 0`),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
    check(
      "products_image_version_positive",
      sql`${table.imageVersion} is null or ${table.imageVersion} > 0`
    ),
    check(
      "products_image_width_positive",
      sql`${table.imageWidth} is null or ${table.imageWidth} > 0`
    ),
    check(
      "products_image_height_positive",
      sql`${table.imageHeight} is null or ${table.imageHeight} > 0`
    ),
    index("products_organization_category_id_idx").on(
      table.organizationId,
      table.categoryId
    ),
    uniqueIndex("products_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
    foreignKey({
      columns: [table.organizationId, table.categoryId],
      foreignColumns: [categories.organizationId, categories.id],
      name: "products_organization_category_fk",
    }),
    index("products_active_name_idx")
      .on(table.name)
      .where(sql`archived_at IS NULL`),
    index("products_archived_idx")
      .on(table.archivedAt)
      .where(sql`archived_at IS NOT NULL`),
  ]
);

export const productPriceChanges = pgTable(
  "product_price_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    previousPrice: decimal("previous_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    nextPrice: decimal("next_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    changedByUserId: text("changed_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    check(
      "product_price_changes_previous_price_non_negative",
      sql`${table.previousPrice} >= 0`
    ),
    check(
      "product_price_changes_next_price_non_negative",
      sql`${table.nextPrice} >= 0`
    ),
    index("product_price_changes_product_created_at_idx").on(
      table.organizationId,
      table.productId,
      table.createdAt
    ),
    index("product_price_changes_changed_by_user_id_idx").on(
      table.changedByUserId
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_price_changes_organization_product_fk",
    }),
  ]
);

export const productStockEntries = pgTable(
  "product_stock_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
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
      table.organizationId,
      table.productId,
      table.stockedOn
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_stock_entries_organization_product_fk",
    }),
  ]
);

export const productStockWriteOffs = pgTable(
  "product_stock_write_offs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
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
      table.organizationId,
      table.productId,
      table.happenedOn
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_stock_write_offs_organization_product_fk",
    }),
  ]
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    occurredOn: date("occurred_on").default(sql`CURRENT_DATE`).notNull(),
    status: saleStatusEnum("status").default("completed").notNull(),
    paymentMethod: salePaymentMethodEnum("payment_method")
      .default("pix")
      .notNull(),
    paymentInstallments: integer("payment_installments").default(0).notNull(),
    paymentFeePayer: salePaymentFeePayerEnum("payment_fee_payer")
      .default("not_applicable")
      .notNull(),
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
    chargedAmount: decimal("charged_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    cancelledAt: timestamp("cancelled_at", tz),
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
    check(
      "sales_payment_method_fee_payer_valid",
      sql`(${table.paymentMethod} = 'pix' and ${table.paymentFeePayer} = 'not_applicable') or (${table.paymentMethod} = 'card' and ${table.paymentFeePayer} in ('not_applicable', 'seller', 'customer'))`
    ),
    check("sales_fee_amount_non_negative", sql`${table.feeAmount} >= 0`),
    check("sales_total_amount_non_negative", sql`${table.totalAmount} >= 0`),
    check(
      "sales_charged_amount_non_negative",
      sql`${table.chargedAmount} >= 0`
    ),
    check(
      "sales_charged_amount_gte_total_amount",
      sql`${table.chargedAmount} >= ${table.totalAmount}`
    ),
    check(
      "sales_status_cancelled_at_consistent",
      sql`(${table.status} = 'completed' and ${table.cancelledAt} is null) or (${table.status} = 'cancelled' and ${table.cancelledAt} is not null)`
    ),
    // Composite indexes: equality first, range last
    index("sales_organization_status_occurred_on_idx").on(
      table.organizationId,
      table.status,
      table.occurredOn
    ),
    index("sales_organization_payment_method_occurred_on_idx").on(
      table.organizationId,
      table.paymentMethod,
      table.occurredOn
    ),
    index("sales_organization_occurred_on_created_at_idx").on(
      table.organizationId,
      table.occurredOn,
      table.createdAt
    ),
    uniqueIndex("sales_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
  ]
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
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
    index("sale_items_sale_id_idx").on(table.organizationId, table.saleId),
    index("sale_items_product_id_idx").on(
      table.organizationId,
      table.productId
    ),
    uniqueIndex("sale_items_sale_product_unique_idx").on(
      table.organizationId,
      table.saleId,
      table.productId
    ),
    foreignKey({
      columns: [table.organizationId, table.saleId],
      foreignColumns: [sales.organizationId, sales.id],
      name: "sale_items_organization_sale_fk",
    }),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "sale_items_organization_product_fk",
    }),
  ]
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    metric: goalMetricEnum("metric").notNull(),
    displayMode: goalDisplayModeEnum("display_mode").notNull(),
    targetValue: decimal("target_value", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: goalStatusEnum("status").notNull().default("active"),
    resolvedAt: timestamp("resolved_at", tz),
    resolvedValue: decimal("resolved_value", { precision: 12, scale: 2 }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => [
    check("goals_target_value_positive", sql`${table.targetValue} > 0`),
    check(
      "goals_period_end_gte_start",
      sql`${table.periodEnd} >= ${table.periodStart}`
    ),
    index("goals_status_idx").on(table.organizationId, table.status),
    index("goals_period_end_idx").on(table.organizationId, table.periodEnd),
    index("goals_created_by_user_id_idx").on(
      table.organizationId,
      table.createdByUserId
    ),
  ]
);
