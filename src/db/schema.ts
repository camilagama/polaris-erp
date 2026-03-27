import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Tabela de importações
export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  totalRecords: integer("total_records").default(0).notNull(),
  processedRecords: integer("processed_records").default(0).notNull(),
  failedRecords: integer("failed_records").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Tabela de logs de importação
export const importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  importId: integer("import_id")
    .notNull()
    .references(() => imports.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  level: varchar("level", { length: 50 }).default("info").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
