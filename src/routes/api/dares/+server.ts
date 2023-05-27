import { dummyDares } from "$lib/utils";
import { json } from "@sveltejs/kit";

export async function GET() {
  const dares = dummyDares;

  return json(dares);
}
