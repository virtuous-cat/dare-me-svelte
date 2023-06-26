import { GameCodeSchema, GameOptionsSchema } from "$lib/game.types.js";
import { fail, redirect } from "@sveltejs/kit";

import { ADMIN_KEY } from "$env/static/private";
import { customAlphabet } from "nanoid";
import redis from "$lib/server/redis.js";
import type { Actions } from "./$types";

console.log("(site) page.server in");

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
  login: async ({ request }) => {
    const data = await request.formData();
    const admin = data.get("adminKey") === ADMIN_KEY;
    if (!admin) {
      return fail(403, { loginError: "Permission Denied" });
    }
    return { admin };
  },

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
      console.error("error in gameLaunch codeResult", errorMessages);
      return fail(400, {
        gameLaunched: false,
        launchGameErrors: errorMessages,
      });
    }

    const rawCategories = data.get("categories");

    if (typeof rawCategories !== "string") {
      console.error("error getting rawCategories");
      const delGame = await redis.del(`game:${codeResult.data}`);
      console.log(`deleted game ${codeResult.data} from redis`, delGame);
      return fail(400, {
        gameLaunched: false,
        launchGameErrors: {
          _errors: [`error getting rawCategories`],
        },
      });
    }

    const gameOptions = {
      hostId: data.get("hostId"),
      interaction: data.get("interaction"),
      categories: JSON.parse(rawCategories),
    };

    console.log("gameOptions", gameOptions)

    const gameOptionsResult = GameOptionsSchema.safeParse(gameOptions);
    if (!gameOptionsResult.success) {
      const errorMessages = gameOptionsResult.error.format();
      console.error("error in gameOptions", errorMessages);
      const delGame = await redis.del(`game:${codeResult.data}`);
      console.log(`deleted game ${codeResult.data} from redis`, delGame)
      return fail(400, {
        gameLaunched: false,
        launchGameErrors: {
          _errors: [`Problem launching game, please try again`],
        },
      });
    }

    const saved = await redis.hset(
      `game:${codeResult.data}`,
      gameOptionsResult.data
    );
    if (saved !== 3) {
      console.error("Error saving game options in redis, saved:", saved);
      const delGame = await redis.del(`game:${codeResult.data}`);
      console.log(`deleted game ${codeResult.data} from redis`, delGame);
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
} satisfies Actions;

console.log("(site) page.server out");
