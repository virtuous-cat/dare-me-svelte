import { error, json } from "@sveltejs/kit";

import { DareDbInputSchema } from "$lib/db.types";
import { dummyDares } from "$lib/utils";

export async function GET({ params }) {
  const dare = dummyDares.filter((dare) => dare.dareId === params.dareId);

  return json(dare);
}
export async function POST({ request }) {
  const dareToSave = await request.json();
  const parsedDare = DareDbInputSchema.safeParse(dareToSave);
  if (!parsedDare.success) {
    console.error(parsedDare.error.format());
    throw error(400, { message: "Error in dare format" });
  }
  // TODO: save to db instead of id hack
  const tagsWithIds = parsedDare.data.tags?.map((tag) => {
    return {
      name: tag,
      id: Math.ceil(Math.random() * 1000),
    };
  });
  const dareAdded = {
    ...parsedDare.data,
    dareId: crypto.randomUUID,
    tags: tagsWithIds,
  };

  return json(dareAdded, { status: 201 });
}

export async function PUT({ request }) {
  const dareToUpdate = await request.json();
  const parsedDare = DareDbInputSchema.safeParse(dareToUpdate);
  if (!parsedDare.success) {
    console.error(parsedDare.error.format());
    throw error(400, { message: "Error in dare format" });
  }
  // TODO: save to db instead of id hack
  const tagsWithIds = parsedDare.data.tags?.map((tag) => {
    return {
      name: tag,
      id: Math.ceil(Math.random() * 1000),
    };
  });
  const dareUpdated = { ...parsedDare.data, tags: tagsWithIds };

  return json(dareUpdated, { status: 200 });
}
