import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  nickname: text('nickname').notNull(),
  passwordHash: text('password_hash'),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  gold: integer('gold').notNull().default(1000),
  rankPoints: integer('rank_points').notNull().default(0),
  preferredSide: text('preferred_side').notNull().default('balance'),
  avatarId: text('avatar_id').notNull().default('av_g_hugo'),
  unlockedAvatarIds: jsonb('unlocked_avatar_ids').$type<string[]>().notNull().default([]),
  pendingCommonPacks: integer('pending_common_packs').notNull().default(0),
  claimedLevelMilestones: jsonb('claimed_level_milestones').$type<number[]>().notNull().default([]),
  rankBlockedTotal: boolean('rank_blocked_total').notNull().default(false),
  rankBlockFromTier: text('rank_block_from_tier'),
  unlockedCardIds: jsonb('unlocked_card_ids').$type<string[]>().notNull().default([]),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  tutorialRewardClaimed: boolean('tutorial_reward_claimed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playerDecks = pgTable(
  'player_decks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    slotId: integer('slot_id').notNull(),
    name: text('name').notNull(),
    cardIds: jsonb('card_ids').$type<string[]>().notNull(),
    isActive: boolean('is_active').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userSlotUnique: uniqueIndex('player_decks_user_slot_idx').on(table.userId, table.slotId),
  })
);

export const matchHistory = pgTable('match_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  result: text('result').notNull(), // 'victory' | 'defeat'
  deckName: text('deck_name').notNull(),
  deckCode: text('deck_code').notNull().default('2/303'),
  rpChange: integer('rp_change').notNull().default(0),
  goldEarned: integer('gold_earned').notNull().default(0),
  xpEarned: integer('xp_earned').notNull().default(0),
  opponentName: text('opponent_name').notNull(),
  opponentRank: text('opponent_rank').notNull().default('Bronze III'),
  mode: text('mode').notNull().default('pvp_ranked'),
  playedAt: timestamp('played_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  decks: many(playerDecks),
  matches: many(matchHistory),
}));

export const playerDecksRelations = relations(playerDecks, ({ one }) => ({
  user: one(users, {
    fields: [playerDecks.userId],
    references: [users.id],
  }),
}));

export const matchHistoryRelations = relations(matchHistory, ({ one }) => ({
  user: one(users, {
    fields: [matchHistory.userId],
    references: [users.id],
  }),
}));
