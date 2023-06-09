import { DareDbInputSchema, GameDareSchema } from "$lib/db.types";
import { error, json } from "@sveltejs/kit";

import cuid from "cuid";
import { dummyDares } from "$lib/utils";
import type { RequestHandler } from "./$types.js";

export const GET = (async ({ params }) => {
  const dare = dummyDares.filter((dare) => dare.dareId === params.dareId);

  return json(dare);
}) satisfies RequestHandler

export const POST = (async ({ request }) => {
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
    dareId: cuid(),
    tags: tagsWithIds,
    children: [],
  };

  return json(dareAdded, { status: 201 });
}) satisfies RequestHandler

export const PUT = (async ({ request, params }) => {
  console.log("in PUT function for dareId", params.dareId);
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
  console.log("returning from PUT", dareUpdated);

  return json(dareUpdated, { status: 200 });
}) satisfies RequestHandler

export const DELETE = (async ({ request }) => {
  const { dareId } = await request.json();
  const parsedDareId = GameDareSchema.shape.dareId.safeParse(dareId);

  if (!parsedDareId.success) {
    console.error(parsedDareId.error.format());
    throw error(400, { message: "Error in dare id" });
  }
  // TODO: change status in db to disabled
  console.log("dare disabled", parsedDareId.data);
  return new Response(null, { status: 204 });
}) satisfies RequestHandler
