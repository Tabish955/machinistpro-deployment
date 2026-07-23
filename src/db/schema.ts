import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  subscription: text("subscription"),
  expiry: text("expiry"),
  rememberMe: boolean("remember_me").notNull().default(false),
  isValid: boolean("is_valid").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
