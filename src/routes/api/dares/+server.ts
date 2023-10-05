import { error, json } from "@sveltejs/kit";

import {
  DareDbInputSchema,
  type DareDbInput,
  type DareWithChildren,
} from "$lib/db.types.js";
import cuid from "cuid";
import { dummyDares } from "$lib/utils";
import type { RequestHandler } from "./$types";
import prisma from "$lib/prisma";
import { Prisma } from "@prisma/client";

export const GET = (async ({ url }) => {
  // TODO: Remove hack once Auth implemented
  const user = {
    admin: url.searchParams.has("admin"),
  };

  const daresWhere: Prisma.DareWhereInput = { parent: null };
  const childrenWhere: Prisma.DareWhereInput = {};

  //TODO: When Auth implemented, update filters to allow non-admin logged-in users to see all their own non-disabled dares
  if (!user.admin) {
    daresWhere.status = { equals: "public" };
    childrenWhere.status = { equals: "public" };
  }

  const dares = await prisma.dare.findMany({
    where: daresWhere,
    include: {
      children: {
        where: childrenWhere,
        include: { tags: true },
      },
      tags: true,
    },
  });

  return json(dares);
}) satisfies RequestHandler;

export const POST = (async ({ request }) => {
  const daresToSave = await request.json();
  console.log(daresToSave);
  const daresMap = new Map<string, DareDbInput>(daresToSave);
  const parsedDares = DareDbInputSchema.array().safeParse(
    Array.from(daresMap.values())
  );
  if (!parsedDares.success) {
    console.error(parsedDares.error.format());
    throw error(400, { message: "Error in dare format" });
  }

  const failedIds: string[] = [];
  let daresAddedToDb: DareWithChildren[] = [];

  for (const [tempId, dare] of daresMap) {
    const query = {
      include: { tags: true },
      data: {
        ...dare,
        tags: {
          connectOrCreate: dare.tags?.map((tag) => {
            return { where: { name: tag }, create: { name: tag } };
          }),
        },
      },
    };
    try {
      const addedDare = await prisma.dare.create(query);
      daresAddedToDb.push({ ...addedDare, children: [] });
    } catch (error) {
      console.error(error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        try {
          const addedDare = await prisma.dare.create(query);
          daresAddedToDb.push({ ...addedDare, children: [] });
        } catch (error) {
          console.error(error);
          failedIds.push(tempId);
        }
        continue;
      }
      failedIds.push(tempId);
    }
  }

  if (!daresAddedToDb.length) {
    throw error(500, { message: "Unable to save dares" });
  }

  return json({ daresAddedToDb, failedIds }, { status: 201 });
}) satisfies RequestHandler;
