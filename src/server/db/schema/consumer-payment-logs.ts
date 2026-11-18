import { relations, sql } from "drizzle-orm"
import { index, integer, jsonb, pgEnum, pgPolicy, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import {
  type ConsumerOrderDetails,
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "@/constants/consumer-payment-logs"
import { timestamps } from "@/server/db/helpers"

import { type Consumer, consumers } from "./consumers"
import { type DigitalSalesInformation, digitalSalesInformation } from "./digital-sales-information"
import { type PaymentLog, paymentLogs } from "./payment-logs"
import { type User, users } from "./users"

export const paymentMethodEnum = pgEnum("payment_method", Object.values(PaymentMethodEnum) as [string, ...string[]])

export const paymentStatusEnum = pgEnum("payment_status", Object.values(PaymentStatusEnum) as [string, ...string[]])

export const orderStatusEnum = pgEnum("order_status", Object.values(OrderStatusEnum) as [string, ...string[]])

export const consumerPaymentLogs = pgTable(
  "consumer_payment_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    digitalSalesId: uuid("digital_sales_id")
      .notNull()
      .references(() => digitalSalesInformation.id),

    consumerId: uuid("consumer_id")
      .notNull()
      .references(() => consumers.id),

    orderDetails: jsonb("order_details").$type<ConsumerOrderDetails>().notNull(),

    paymentMethod: paymentMethodEnum("payment_method"),

    paymentStatus: paymentStatusEnum("payment_status"),

    barsQuantity: integer("bars_quantity").notNull(),

    amountCents: integer("amount_cents").notNull(),

    cardTransactionId: varchar("card_transaction_id").references(() => paymentLogs.transactionId),

    orderStatus: orderStatusEnum("order_status").notNull(),

    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    updatedByUserId: uuid("updated_by_user_id").references(() => users.id),

    ...timestamps,
  },
  table => [
    pgPolicy("consumer_payment_logs_all", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      using: sql`(SELECT public.authorize('consumer_payment_logs.all'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumer_payment_logs_select", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`(SELECT public.authorize('consumer_payment_logs.select'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumer_payment_logs_insert", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT public.authorize('consumer_payment_logs.insert'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumer_payment_logs_update", {
      as: "permissive",
      to: authenticatedRole,
      for: "update",
      using: sql`(SELECT public.authorize('consumer_payment_logs.update'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumer_payment_logs_delete", {
      as: "permissive",
      to: authenticatedRole,
      for: "delete",
      using: sql`(SELECT public.authorize('consumer_payment_logs.delete'::public.app_permission) AS authorize)`,
    }),

    index("idx_consumer_payment_logs_digital_sales_id").on(table.digitalSalesId),

    index("idx_consumer_payment_logs_consumer_id").on(table.consumerId),

    index("idx_consumer_payment_logs_created_at").on(table.createdAt),

    index("idx_consumer_payment_logs_updated_by").on(table.updatedByUserId),

    index("idx_consumer_payment_logs_digital_sales_order_status").on(table.digitalSalesId, table.orderStatus),
  ]
).enableRLS()

export type ConsumerPaymentLog = typeof consumerPaymentLogs.$inferSelect & {
  digitalSales?: DigitalSalesInformation | null
  consumer?: Consumer | null
  paymentLog?: PaymentLog | null
  updatedByUser?: User | null
}

export type ConsumerPaymentLogSelect = typeof consumerPaymentLogs.$inferSelect

export type ConsumerPaymentLogInsert = typeof consumerPaymentLogs.$inferInsert

export const consumerPaymentLogsRelations = relations(consumerPaymentLogs, ({ one }) => ({
  digitalSales: one(digitalSalesInformation, {
    fields: [consumerPaymentLogs.digitalSalesId],
    references: [digitalSalesInformation.id],
  }),

  consumer: one(consumers, {
    fields: [consumerPaymentLogs.consumerId],
    references: [consumers.id],
  }),

  paymentLog: one(paymentLogs, {
    fields: [consumerPaymentLogs.cardTransactionId],
    references: [paymentLogs.transactionId],
  }),

  updatedByUser: one(users, {
    fields: [consumerPaymentLogs.updatedByUserId],
    references: [users.id],
  }),
}))
