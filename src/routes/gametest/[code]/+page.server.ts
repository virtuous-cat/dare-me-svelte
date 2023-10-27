import {
  DareWithChildrenSchema,
  BaseDareSchema,
  MultiupdateOptionsSchema,
  INTERACTION,
  type Interaction as LibInteraction,
  DareWithTagsSchema,
} from "$lib/db.types.js";

import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import prisma from "$lib/server/prisma";
import redis from "$lib/server/redis";
import { Interaction } from "@prisma/client";

const getInteractionArray = (interaction: LibInteraction) => {
  switch (interaction) {
    case INTERACTION.Enum.chat:
      return [Interaction.chat];
    case INTERACTION.Enum.audio:
      return [Interaction.chat, Interaction.audio];
    case INTERACTION.Enum.video:
      return [Interaction.chat, Interaction.audio, Interaction.video];
    case INTERACTION.Enum.physical:
      return [
        Interaction.chat,
        Interaction.audio,
        Interaction.video,
        Interaction.physical,
      ];
    case INTERACTION.Enum.unmasked:
      return [
        Interaction.chat,
        Interaction.audio,
        Interaction.video,
        Interaction.physical,
        Interaction.unmasked,
      ];

    default:
      break;
  }
};
export const load: PageServerLoad = async ({ params }) => {
  const code = params.code;
  // const redisCategories = await redis.hget(`game:${code}`, "categories");
  const redisCategories = ["kink", "flirty", "truth"];
  const gameCategories = DareWithTagsSchema.shape.category
    .array()
    .parse(redisCategories);
  // const redisInteraction = await redis.hget(`game:${code}`, "interaction");
  const redisInteraction = "physical";
  const gameInteraction =
    DareWithTagsSchema.shape.minInteraction.parse(redisInteraction);
  const interactionsToInclude = getInteractionArray(gameInteraction);
  // const gameDareIds = await redis.smembers(`game:${code}:dares`);
  const gameDareIds: string[] = [];
  const dares = await prisma.dare.findMany({
    orderBy: {
      dareId: "desc",
    },
    where: {
      OR: [
        {
          status: "public",
          minInteraction: { in: interactionsToInclude },
          category: { in: gameCategories },
        },
        {
          dareId: { in: gameDareIds },
        },
      ],
      AND: { parent: null },
    },
    include: {
      children: {
        orderBy: {
          dareId: "asc",
        },
        where: {
          OR: [
            {
              status: "public",
              minInteraction: { in: interactionsToInclude },
              category: { in: gameCategories },
            },
            {
              dareId: { in: gameDareIds },
            },
          ],
        },
        include: { tags: true },
      },
      tags: true,
    },
  });
  const parsedDares = DareWithChildrenSchema.array().parse(dares);

  return { dares: parsedDares };
};

export const actions = {} satisfies Actions;
