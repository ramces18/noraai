import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  theme: text("theme").notNull().default("system"),
  tone: text("tone").notNull().default("warm"),
  fontSize: text("font_size").notNull().default("medium"),
  reduceMotion: integer("reduce_motion", { mode: "boolean" }).notNull().default(false),
  responseLength: text("response_length").notNull().default("balanced"),
  memoryEnabled: integer("memory_enabled", { mode: "boolean" }).notNull().default(true),
  enterToSend: integer("enter_to_send", { mode: "boolean" }).notNull().default(true),
  highContrast: integer("high_contrast", { mode: "boolean" }).notNull().default(false),
  chatWidth: text("chat_width").notNull().default("comfortable"),
  pronouns: text("pronouns").notNull().default(""),
  aboutMe: text("about_me").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  lastLoginAt: integer("last_login_at").notNull(),
}, (table) => [index("idx_users_email").on(table.email)]);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_conversations_user_updated").on(table.userId, table.updatedAt)]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  important: integer("important", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_messages_conversation_created").on(table.conversationId, table.createdAt)]);

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  category: text("category").notNull().default("personal"),
  sourceMessageId: text("source_message_id").references(() => messages.id, { onDelete: "set null" }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_memories_user_updated").on(table.userId, table.updatedAt),
  uniqueIndex("idx_memories_source_message").on(table.sourceMessageId),
]);

export const passwordAccounts = sqliteTable("password_accounts", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  iterations: integer("iterations").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
