import { error, json } from "@sveltejs/kit";

import { DareDbInputSchema } from "$lib/db.types.js";
import { dummyDares } from "$lib/utils";

export async function GET() {
  const dares = dummyDares;

  return json(dares);
}

export async function POST({ request }) {
  const daresToSave = await request.json();
  const parsedDares = DareDbInputSchema.array().safeParse(daresToSave);
  if (!parsedDares.success) {
    console.error(parsedDares.error.format());
    throw error(400, { message: "Error in dare format" });
  }
  // TODO: save to db instead of id hack
  const daresAdded = parsedDares.data.map((dare) => {
    const tagsWithIds = dare.tags?.map((tag) => {
      return {
        name: tag,
        id: Math.ceil(Math.random() * 1000),
      };
    });
    return {
      ...dare,
      dareId: crypto.randomUUID,
      tags: tagsWithIds,
    };
  });

  return json(daresAdded, { status: 201 });
}
