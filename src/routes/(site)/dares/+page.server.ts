import { GameDareSchema, MultiupdateOptionsSchema } from "$lib/db.types.js";

import { fail } from "@sveltejs/kit";

export const actions = {
  multiupdate: async ({ request }) => {
    const data = await request.formData();
    const parsedIdsToUpdate = GameDareSchema.shape.dareId
      .array()
      .safeParse(data.getAll("selectedIds"));
    const partnered = data.get("partnered");
    if (typeof partnered !== "string") {
      return fail(400, {
        multiupdateError: "Format error",
      });
    }
    const fieldsToUpdate = {
      partnered: JSON.parse(partnered),
      status: data.get("status") === "null" ? null : data.get("status"),
      category: data.get("category") === "null" ? null : data.get("category"),
      minInteraction:
        data.get("minInteraction") === "null"
          ? null
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
    // TODO: update in db
    return { success: true };
  },
};
