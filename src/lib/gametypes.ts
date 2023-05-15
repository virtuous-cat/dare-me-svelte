import { z } from "zod";

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

export const GameDareSchema = z.object({
  dareId: z.string().cuid(),
  dareText: z.string().max(700, { message: "Dare text max 700 characters" }),
});

export const PlayerSchema = z.object({
  playerId: PlayerIdSchema,
  playerName: PlayerNameSchema,
  dares: GameDareSchema.array(),
});

export type Player = z.infer<typeof PlayerSchema>;

export const RedisPlayerSchema = PlayerSchema.extend({
  turns: z.number().int().nonnegative(),
});

export type RedisPlayer = z.infer<typeof RedisPlayerSchema>;

export const PlayersSchema = PlayerSchema.array();

export type Players = z.infer<typeof PlayersSchema>;

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
