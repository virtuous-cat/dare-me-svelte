import {
  DareDbInputSchema,
  BaseDareSchema,
  type DareWithChildren,
} from "$lib/db.types";
import { error, json } from "@sveltejs/kit";

import cuid from "cuid";
import { dummyDares } from "$lib/utils";
import type { RequestHandler } from "./$types.js";
import prisma from "$lib/server/prisma.js";
import { Prisma } from "@prisma/client";

export const GET = (async ({ params }) => {
  const dare = await prisma.dare.findUnique({
    where: {
      dareId: params.dareId,
    },
    include: {
      tags: true,
      children: {
        include: { tags: true },
      },
    },
  });

  if (dare === null) {
    throw error(400, { message: "Dare Not Found" });
  }

  return json(dare);
}) satisfies RequestHandler;

export const POST = (async ({ request }) => {
  const dareToSave = await request.json();
  const parsedDare = DareDbInputSchema.safeParse(dareToSave);
  if (!parsedDare.success) {
    console.error(parsedDare.error.format());
    throw error(400, { message: "Error in dare format" });
  }

  const query = {
    include: { tags: true },
    data: {
      ...parsedDare.data,
      tags: {
        connectOrCreate: parsedDare.data.tags?.map((tag) => {
          return { where: { name: tag }, create: { name: tag } };
        }),
      },
    },
  };
  let dareAdded: DareWithChildren;
  try {
    const addedDare = await prisma.dare.create(query);
    dareAdded = { ...addedDare, children: [] };
  } catch (e) {
    console.error(e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      try {
        const addedDare = await prisma.dare.create(query);
        dareAdded = { ...addedDare, children: [] };
      } catch (e) {
        console.error(e);
        throw error(500, { message: "Unable to save dare." });
      }
    } else {
      throw error(500, { message: "Unable to save dare." });
    }
  }

  return json(dareAdded, { status: 201 });
}) satisfies RequestHandler;

export const PUT = (async ({ request, params }) => {
  console.log("in PUT function for dareId", params.dareId);
  const dareToUpdate = await request.json();
  const parsedDare = DareDbInputSchema.safeParse(dareToUpdate);
  if (!parsedDare.success) {
    console.error(parsedDare.error.format());
    throw error(400, { message: "Error in dare format" });
  }
  let dareUpdated: DareWithChildren;
  try {
    const { tags: oldTags } = await prisma.dare.findUniqueOrThrow({
      where: {
        dareId: parsedDare.data.dareId,
      },
      select: {
        tags: {
          select: { name: true },
        },
      },
    });
    const tagsToDisconnect = oldTags.filter((oldTag) => {
      return !parsedDare.data.tags?.includes(oldTag.name);
    });
    const query = {
      where: {
        dareId: parsedDare.data.dareId,
      },
      data: {
        ...parsedDare.data,
        tags: {
          connectOrCreate: parsedDare.data.tags?.map((tag) => {
            return { where: { name: tag }, create: { name: tag } };
          }),
          disconnect: tagsToDisconnect,
        },
      },
      include: {
        tags: true,
        children: {
          include: { tags: true },
        },
      },
    };
    try {
      dareUpdated = await prisma.dare.update(query);
    } catch (e) {
      console.error(e);
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        try {
          dareUpdated = await prisma.dare.update(query);
        } catch (e) {
          console.error(e);
          throw error(500, { message: "Unable to update dare." });
        }
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        throw error(400, { message: "No such dare found" });
      } else {
        throw error(500, { message: "Unable to update dare" });
      }
    }
  } catch (e) {
    console.error(e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw error(400, { message: "No such dare found" });
    } else {
      throw error(500, { message: "Unable to update dare" });
    }
  }
  console.log("returning from PUT", dareUpdated);

  return json(dareUpdated, { status: 200 });
}) satisfies RequestHandler;

export const DELETE = (async ({ request }) => {
  const { dareId } = await request.json();
  const parsedDareId = BaseDareSchema.shape.dareId.safeParse(dareId);

  if (!parsedDareId.success) {
    console.error(parsedDareId.error.format());
    throw error(400, { message: "Error in dare id" });
  }

  try {
    const disabledDare = await prisma.dare.update({
      where: {
        dareId: parsedDareId.data,
      },
      data: {
        status: "disabled",
      },
      select: { dareId: true },
    });
    console.log("dare disabled", disabledDare);
  } catch (e) {
    console.error(e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw error(400, { message: "No such dare found" });
    } else {
      throw error(500, { message: "Unable to disable dare" });
    }
  }
  return new Response(null, { status: 204 });
}) satisfies RequestHandler;
