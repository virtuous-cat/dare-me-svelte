import { GameDareSchema, MultiupdateOptionsSchema } from "$lib/db.types.js";

import { fail } from "@sveltejs/kit";

export const actions = {
  multiupdate: async ({ request }) => {
    const data = await request.formData();
    const parsedIdsToUpdate = GameDareSchema.shape.dareId
      .array()
      .safeParse(data.getAll("selectedIds"));
    const parsedFieldsToUpdate = MultiupdateOptionsSchema.safeParse({
      partnered: data.get("partnered"),
      status: data.get("status"),
      category: data.get("category"),
      minInteraction: data.get("minInteraction"),
      tags: data.getAll("tags"),
    });
    if (!parsedFieldsToUpdate.success || !parsedIdsToUpdate) {
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
    // TODO: update in db
    return { success: true };
  },
};
