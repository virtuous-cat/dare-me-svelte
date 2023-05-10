import { GameCodeSchema, PlayerNameSchema } from "$lib/gametypes.js";
import { fail, redirect } from "@sveltejs/kit";

import { customAlphabet } from "nanoid";
import redis from "$lib/server/redis.js";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 4);

export const actions = {
  generateGame: async () => {
    const newCode = nanoid();
    //TODO: check redis for existing game
    const saved = await redis.hset(`game:${newCode}`, { turn: 0 });
    if (saved === 0) {
      console.log("failed to create game in redis");
      return fail(500, {
        gameGenerated: false,
        generateGameError: { _errors: [`Problem creating game`] },
      });
    }
    console.log(`game ${newCode} created in redis`, saved);
    return { gameCode: newCode, gameGenerated: true };
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
    //TODO find in redis
    // const gameExists =
    // if (!gameExists) {
    //   return fail(400, {
    //     gameFound: false,
    //     findGameErrors: {_errors: [`Unable to find game ${data.get("gameCode")}`]},
    //   });
    // }
    return {
      gameFound: true,
      verifiedCode: codeResult.data,
    };
  },
  launchGame: async ({ request }) => {
    const data = await request.formData();
    // TODO: verify game options and set in redis
    // const gameResult = ;
    // if (!gameResult.success) {
    //   const errorMessages = gameResult.error.format();
    //   return fail(400, {
    //     gameLaunched: false,
    //     launchGameErrors: errorMessages,
    //   });
    // }
    throw redirect(303, `/games/${data.get("gameCode")}`);
  },
};
