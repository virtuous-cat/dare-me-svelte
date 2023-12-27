import {
  CATEGORY,
  BaseDareSchema,
  INTERACTION,
  GameDareSchema,
  type GameDare,
} from "./db.types.js";

import { z } from "zod";

export const darerTurnStages = {
  SPIN: "spin",
  SELECT: "select",
  SENT: "sent",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  COUNTERED: "countered",
  END: "end",
  KEEP_DARE: "keep-dare",
} as const;

export type DarerTurnStage =
  (typeof darerTurnStages)[keyof typeof darerTurnStages];

export const dareeTurnStages = {
  CHOSEN: "chosen",
  CONFIRM: "confirm",
  DECLINED: "declined",
  COUNTERED: "counter",
  COUNTER_ACCEPTED: "counter-accepted",
  COUNTER_DECLINED: "counter-declined",
  END: "end",
  KEEP_DARE: "keep-dare",
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
});

export type Player = z.infer<typeof PlayerSchema>;

export type Players = [string, Player][];

export const GameOptionsSchema = z.object({
  hostId: PlayerIdSchema,
  interaction: INTERACTION,
  categories: CATEGORY.array(),
});

export const GameSyncSchema = z.object({
  hostId: PlayerIdSchema,
  darer: PlayerIdSchema.optional(),
  daree: PlayerIdSchema.optional(),
  currentDare: GameDareSchema.optional(),
});

export type GameSyncBase = z.infer<typeof GameSyncSchema>;

export const ServerChatSchema = z.object({
  playerId: PlayerIdSchema,
  playerName: PlayerNameSchema,
  message: z.string(),
});

export type ServerChat = z.infer<typeof ServerChatSchema>;

type NewDaree = { dareeId: string; dareeDares: GameDare[] } | { error: string };
type DareeResponse =
  | { response: "accept" | "decline" }
  | { response: "counter"; dareOwner: "darer" | "daree"; counter: GameDare };
type DarerCounterResponse =
  | { response: "accept" }
  | { response: "decline"; soloDareSelected: GameDare };

export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;

  serverChat: (chat: ServerChat) => void;
  syncGameState: (state: GameSyncBase & { players: Players }) => void;
  newPlayerJoined: (newPlayer: Player) => void;
  PlayerLeft: (playerId: string) => void;
  PlayerDisconnected: (playerId: string) => void;
  PlayerKicked: (playerId: string) => void;
  playerReadinessUpdate: ({
    playerId,
    ready,
  }: {
    playerId: string;
    ready: boolean;
  }) => void;
  hostChange: (newHostId: string) => void;
  serverError: () => void;
  newTurn: (darerId: string) => void;
  spinning: () => void;
  dareeSelected: (daree: NewDaree) => void;
  darerSelectedDare: ({
    selectedDare,
    darerPartneredDares,
  }: {
    selectedDare: GameDare;
    darerPartneredDares: GameDare[];
  }) => void;
  dareeResponded: (response: DareeResponse) => void;
  darerRespondedToCounter: (response: DarerCounterResponse) => void;
}

export interface ClientToServerEvents {
  requestSync: (
    callback: (state: GameSyncBase & { players: Players }) => void
  ) => void;
  checkDisco: (
    callback: ({
      wasDisco,
      savedDareIds,
    }: {
      wasDisco: boolean;
      savedDareIds?: string[];
    }) => void
  ) => void;
  chat: (message: string) => void;
  transferHost: (newHostId: string) => void;
  updateDares: (dares: GameDare[]) => void;
  spin: () => void;
  darerSelectDare: (dare: GameDare) => void;
  dareeResponse: (
    response: DareeResponse,
    callback: (ack: string) => void
  ) => void;
  darerCounterResponse: (
    response: DarerCounterResponse,
    callback: (ack: string) => void
  ) => void;
  darerEndTurn: (callback: () => void) => void;
  dareeEndTurn: (callback: () => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  gameRoom: string;
  playerName: string;
}
