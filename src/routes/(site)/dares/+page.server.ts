import {
  DareWithChildrenSchema,
  BaseDareSchema,
  MultiupdateOptionsSchema,
} from "$lib/db.types.js";

import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import prisma from "$lib/prisma";

export const load: PageServerLoad = async ({ fetch, url }) => {
  const res = await fetch(`/api/dares?${url.searchParams.toString()}`);
  const dares = await res.json();
  const parsedDares = DareWithChildrenSchema.array().parse(dares);

  return { dares: parsedDares };
};

export const actions = {
  multiupdate: async ({ request }) => {
    const data = await request.formData();
    const parsedIdsToUpdate = BaseDareSchema.shape.dareId
      .array()
      .safeParse(data.getAll("selectedIds"));
    const partnered = data.get("partnered");
    // if (typeof partnered !== "string") {
    //   return fail(400, {
    //     multiupdateError: "Format error",
    //   });
    // }
    console.log("partnered", partnered);
    const fieldsToUpdate = {
      partnered:
        partnered === "true" ? true : partnered === "false" ? false : undefined,
      status:
        !data.get("status") || data.get("status") === "null"
          ? undefined
          : data.get("status"),
      category:
        !data.get("category") || data.get("category") === "null"
          ? undefined
          : data.get("category"),
      minInteraction:
        !data.get("minInteraction") || data.get("minInteraction") === "null"
          ? undefined
          : data.get("minInteraction"),
      tags: data.getAll("tags"),
    };
    console.log("ids sent", data.getAll("selectedIds"));
    console.log("fields as sent", fieldsToUpdate);
    const parsedFieldsToUpdate =
      MultiupdateOptionsSchema.safeParse(fieldsToUpdate);
    if (!parsedFieldsToUpdate.success || !parsedIdsToUpdate.success) {
      if (!parsedFieldsToUpdate.success) {
        console.error(parsedFieldsToUpdate.error.format());
      }
      if (!parsedIdsToUpdate.success) {
        console.error(parsedIdsToUpdate.error.format());
      }
      return fail(400, {
        multiupdateError: "Format error",
      });
    }
    const { tags, ...updateData } = parsedFieldsToUpdate.data;
    try {
      if (tags.length > 0) {
        const tagsData = tags.map((tag) => {
          return { name: tag };
        });
        await prisma.$transaction([
          prisma.tag.createMany({
            data: tagsData,
            skipDuplicates: true,
          }),
          ...parsedIdsToUpdate.data.map((dareId) =>
            prisma.dare.update({
              where: { dareId },
              data: {
                ...updateData,
                tags: {
                  connect: tagsData,
                },
              },
              select: { dareId: true },
            })
          ),
        ]);
      } else {
        await prisma.dare.updateMany({
          where: {
            dareId: { in: parsedIdsToUpdate.data },
          },
          data: updateData,
        });
      }
    } catch (e) {
      console.error(e);
      fail(500, { message: "Failed to update dares." });
    }
    return { success: true };
  },
} satisfies Actions;
