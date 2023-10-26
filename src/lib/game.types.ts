import {
  CATEGORY,
  BaseDareSchema,
  INTERACTION,
  GameDareSchema,
} from "./db.types.js";

import { z } from "zod";

export const darerTurnStages = {
  SPIN: "spin",
  SELECT: "select",
  SENT: "sent",
  ACCCEPTED: "accepted",
  DECLINED: "declined",
  COUNTERED: "countered",
  END: "end",
} as const;

export type DarerTurnStage =
  (typeof darerTurnStages)[keyof typeof darerTurnStages];

export const dareeTurnStages = {
  CONFIRM: "confirm",
  DECLINED: "declined",
  COUNTER: "counter",
  COUNTER_SENT: "counter-set",
  END: "end",
} as const;

export type DareeTurnStage =
  (typeof dareeTurnStages)[keyof typeof dareeTurnStages];

export const mobileTabs = {
  PLAYERS: "players",
  GAME_LOG: "game-log",
  DARES: "dares",
  CHAT: "chat",
} as const;

export type MobileTab = (typeof mobileTabs)[keyof typeof mobileTabs];

export const GameCodeSchema = z.coerce
  .string()
  .trim()
  .length(4, { message: "Game Code must be 4 characters" })
  .toUpperCase()
  .regex(/^[A-Z0-9]+$/, {
    message: "A valid Game Code may only include letters and numbers",
  });
export const GameCodeValidator = z
  .string()
  .length(4, { message: "Game Code must be 4 characters" })
  .regex(/^[A-Z0-9]+$/, {
    message: "A valid Game Code may only include letters and numbers",
  });

export const PlayerNameSchema = z.coerce
  .string()
  .trim()
  .max(50, { message: "Name must be less than 50 characters" })
  .regex(/^[\p{L}\p{N}\u0020!@#$%^&*(){}:;?,.<>'"_-]+$/gu, {
    message: "Invalid character(s) in name",
  });
export const PlayerNameValidator = z
  .string()
  .max(50, { message: "Name must be less than 50 characters" })
  .regex(/^[\p{L}\p{N}\u0020!@#$%^&*(){}:;?,.<>'"_-]+$/gu, {
    message: "Invalid character(s) in name",
  });

export const PlayerIdSchema = z.string().uuid({ message: "Invalid Player ID" });

export const PlayerSchema = z.object({
  playerId: PlayerIdSchema,
  playerName: PlayerNameSchema,
  ready: z.boolean(),
  dares: GameDareSchema.array(),
});

export type Player = z.infer<typeof PlayerSchema>;

export const RedisPlayerSchema = PlayerSchema.omit({
  dares: true,
  ready: true,
}).extend({
  turns: z.number().int().nonnegative(),
});

export type RedisPlayer = z.infer<typeof RedisPlayerSchema>;

export const PlayersSchema = PlayerSchema.array();

export type Players = z.infer<typeof PlayersSchema>;

export const GameOptionsSchema = z.object({
  hostId: PlayerIdSchema,
  interaction: INTERACTION,
  categories: CATEGORY.array(),
});

export const ServerChatSchema = z.object({
  playerId: PlayerIdSchema,
  playerName: PlayerNameSchema,
  message: z.string(),
});

export type ServerChat = z.infer<typeof ServerChatSchema>;

export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;

  serverChat: (chat: ServerChat) => void;
  syncGameState: ({
    players,
    darer,
    daree,
  }: {
    players: Players;
    darer?: string;
    daree?: string;
  }) => void;
}

export interface ClientToServerEvents {
  chat: (message: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  gameRoom: string;
  playerName: string;
}
