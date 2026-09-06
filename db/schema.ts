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
  companionEnabled: integer("companion_enabled", { mode: "boolean" }).notNull().default(true),
  noraUseCareData: integer("nora_use_care_data", { mode: "boolean" }).notNull().default(false),
  noraUseAlbumMoments: integer("nora_use_album_moments", { mode: "boolean" }).notNull().default(false),
  companionUseWellbeing: integer("companion_use_wellbeing", { mode: "boolean" }).notNull().default(true),
  wellbeingStatsEnabled: integer("wellbeing_stats_enabled", { mode: "boolean" }).notNull().default(true),
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

export const companions = sqliteTable("companions", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  petType: text("pet_type").notNull().default("cat"),
  name: text("name").notNull().default("Lumi"),
  appearance: text("appearance").notNull().default("ink"),
  accessory: text("accessory").notNull().default("none"),
  personality: text("personality").notNull().default("calm"),
  communicationStyle: text("communication_style").notNull().default("words"),
  unlockedItems: text("unlocked_items").notNull().default('["cushion"]'),
  bondStage: integer("bond_stage").notNull().default(1),
  setupComplete: integer("setup_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lastInteractionAt: integer("last_interaction_at").notNull(),
});

export const wellbeingEntries = sqliteTable("wellbeing_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  activity: text("activity").notNull().default(""),
  emotion: text("emotion").notNull().default(""),
  note: text("note").notNull().default(""),
  allowNora: integer("allow_nora", { mode: "boolean" }).notNull().default(false),
  happenedAt: integer("happened_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_wellbeing_user_happened").on(table.userId, table.happenedAt)]);

export const albumMoments = sqliteTable("album_moments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  emotion: text("emotion").notNull().default(""),
  photoData: text("photo_data"),
  personalNote: text("personal_note").notNull().default(""),
  allowNora: integer("allow_nora", { mode: "boolean" }).notNull().default(false),
  petReaction: text("pet_reaction").notNull().default(""),
  happenedAt: integer("happened_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_album_user_happened").on(table.userId, table.happenedAt)]);
