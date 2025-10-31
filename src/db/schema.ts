import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default(""),
  size: varchar("size", { length: 50 }).default(""),
  gender: varchar("gender", { length: 50 }).default(""),
  color: varchar("color", { length: 100 }).default(""),
  price: int("price").notNull(),
  stock: int("stock").default(0),
  status: varchar("status", { length: 50 }).default("unpublished"),
  coverImage: varchar("cover_image", { length: 255 }).default(""),
  image1: varchar("image_1", { length: 255 }).default(""),
  image2: varchar("image_2", { length: 255 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bundles = mysqlTable("bundles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("unpublished"),
  coverImage: varchar("cover_image", { length: 255 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .onUpdateNow(),
});

export const bundleProducts = mysqlTable(
  "bundle_products",
  {
    bundleId: int("bundle_id")
      .notNull()
      .references(() => bundles.id, { onDelete: "cascade" }),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.bundleId, table.productId] }),
    bundleIdx: index("bundle_products_bundle_idx").on(table.bundleId),
    productIdx: index("bundle_products_product_idx").on(table.productId),
  })
);

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  totalCents: int("total_cents").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .onUpdateNow(),
});

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 191 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    name: varchar("name", { length: 255 }),
    image: varchar("image", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
  })
);

export const userEmails = mysqlTable(
  "user_emails",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("user_emails_user_idx").on(table.userId),
    emailUniqueIdx: uniqueIndex("user_emails_email_unique").on(table.email),
  })
);

export const userSessions = mysqlTable(
  "user_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    token: varchar("token", { length: 191 }).notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    lastActive: timestamp("last_active"),
    ipAddress: varchar("ip_address", { length: 191 }),
    userAgent: varchar("user_agent", { length: 255 }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => ({
    userIdx: index("user_sessions_user_idx").on(table.userId),
    tokenUniqueIdx: uniqueIndex("user_sessions_token_unique").on(table.token),
  })
);

export const emailVerifications = mysqlTable(
  "email_verifications",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    identifier: varchar("identifier", { length: 191 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => ({
    identifierIdx: index("email_verifications_identifier_idx").on(table.identifier),
  })
);

export const accounts = mysqlTable(
  "accounts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    accountId: varchar("account_id", { length: 128 }).notNull(),
    accessToken: varchar("access_token", { length: 512 }),
    refreshToken: varchar("refresh_token", { length: 512 }),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: varchar("scope", { length: 255 }),
    idToken: varchar("id_token", { length: 512 }),
    password: varchar("password", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => ({
    providerAccountUniqueIdx: uniqueIndex("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    userIdx: index("accounts_user_idx").on(table.userId),
  })
);

export const databaseSchema = {
  products,
  bundles,
  bundleProducts,
  orders,
  users,
  userEmails,
  userSessions,
  emailVerifications,
  accounts,
  user_sessions: userSessions,
  email_verifications: emailVerifications,
  user: users,
  session: userSessions,
  verification: emailVerifications,
  account: accounts,
};