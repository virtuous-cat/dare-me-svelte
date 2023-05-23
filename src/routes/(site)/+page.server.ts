import { GameCodeSchema, GameOptionsSchema } from "$lib/gametypes.js";
import { fail, redirect } from "@sveltejs/kit";

import { customAlphabet } from "nanoid";
import redis from "$lib/server/redis.js";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 4);

const generateCode = async (tries: number): Promise<string> => {
  if (tries <= 0) {
    throw new Error("Exceeded max tries to create unique game code");
  }
  const newCode = nanoid();
  const found = await redis.exists(`game:${newCode}`);
  if (found === 0) {
    return newCode;
  }
  return generateCode(tries - 1);
};

export const actions = {
  generateGame: async () => {
    try {
      const newCode = await generateCode(5);
      const saved = await redis.hset(`game:${newCode}`, { turn: 0 });
      if (saved === 0) {
        throw new Error("Failed to create game in redis");
      }
      console.log(`game ${newCode} created in redis`, saved);
      return { gameCode: newCode, gameGenerated: true };
    } catch (error) {
      console.error(error);
      return fail(500, {
        gameGenerated: false,
        generateGameErrors: { _errors: [`Problem creating game`] },
      });
    }
  },

  findGame: async ({ request }) => {
    const data = await request.formData();
    const codeResult = GameCodeSchema.safeParse(data.get("gameCode"));
    console.log("codeResult", codeResult);
    if (!codeResult.success) {
      const errorMessages = codeResult.error.format();
      return fail(400, {
        gameFound: false,
        findGameErrors: errorMessages,
      });
    }
    const found = await redis.exists(`game:${codeResult.data}`);
    if (found === 0) {
      console.error(`Failed to find game ${codeResult.data} in redis`);
      return fail(400, {
        gameFound: false,
        findGameErrors: {
          _errors: [`Unable to find game ${data.get("gameCode")}`],
        },
      });
    }
    if (found > 1) {
      console.error(
        `Found ${found} instances of game:${codeResult.data} in redis`
      );
      return fail(500, {
        gameFound: false,
        findGameErrors: { _errors: [`Problem creating game`] },
      });
    }
    return {
      gameFound: true,
      verifiedCode: codeResult.data,
    };
  },

  launchGame: async ({ request }) => {
    const data = await request.formData();
    const codeResult = GameCodeSchema.safeParse(data.get("gameCode"));
    if (!codeResult.success) {
      const errorMessages = codeResult.error.format();
      return fail(400, {
        gameLaunched: false,
        launchGameErrors: errorMessages,
      });
    }

    const gameOptions = {
      hostId: data.get("hostId"),
      interaction: data.get("interaction"),
      categories: data.get("categories"),
    };

    const gameOptionsResult = GameOptionsSchema.safeParse(gameOptions);
    if (!gameOptionsResult.success) {
      const errorMessages = gameOptionsResult.error.format();
      return fail(400, {
        gameLaunched: false,
        launchGameErrors: errorMessages,
      });
    }

    const saved = await redis.hset(
      `game:${codeResult.data}`,
      gameOptionsResult.data
    );
    if (saved !== 3) {
      console.error("Error saving game options in redis, saved:", saved);
      return fail(500, {
        gameLaunched: false,
        launchGameError: {
          _errors: [`Problem launching game, please try again`],
        },
      });
    }
    console.log(`game options for ${codeResult.data} saved in redis`);

    throw redirect(303, `/games/${codeResult.data}`);
  },
};