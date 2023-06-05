import { DareWithChildrenSchema } from "$lib/db.types.js";

export const load = async ({ fetch }) => {
  const res = await fetch(`/api/dares`);
  const dares = await res.json();
  const parsedDares = DareWithChildrenSchema.array().parse(dares);

  return { dares: parsedDares };
};
