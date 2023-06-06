import { error, json } from "@sveltejs/kit";

import { DareDbInputSchema, type DareDbInput } from "$lib/db.types.js";
import cuid from "cuid";
import { dummyDares } from "$lib/utils";

export async function GET() {
  const dares = dummyDares;

  return json(dares);
}

export async function POST({ request }) {
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
  // TODO: save to db instead of id hack
  const daresAddedToDb = parsedDares.data.map((dare) => {
    const tagsWithIds = dare.tags?.map((tag) => {
      return {
        name: tag,
        id: Math.ceil(Math.random() * 1000),
      };
    });
    return {
      ...dare,
      dareId: cuid(),
      tags: tagsWithIds,
      children: [],
    };
  });
  // TODO: if any dares failed to save in db, return their dareToAddIds as
  const failedIds: string[] = [];

  return json({ daresAddedToDb, failedIds }, { status: 201 });
}
