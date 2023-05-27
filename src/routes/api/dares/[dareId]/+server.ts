import { dummyDares } from "$lib/utils";
import { json } from "@sveltejs/kit";

export async function GET({ params }) {
  const dare = dummyDares.filter((dare) => dare.dareId === params.dareId);

  return json(dare);
}
