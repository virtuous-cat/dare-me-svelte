import type { DareWithChildren } from "./db.types";

export function flattenDareList(dares: DareWithChildren[]) {
  let flattened: DareWithChildren[] = [];
  for (const dare of dares) {
    flattened = [...flattened, dare, ...dare.children];
  }
}

export const dummyDares = [
  {
    status: "pending",
    dareId: "DUIWGBHHXUXBAW",
    dareText: "Kiss the darer on the lips.",
    parentId: null,
    partnered: true,
    category: "unsorted",
    minInteraction: "unmasked",
    timer: null,
    tags: [{ id: 5, name: "kissing" }],
    children: [],
  },
  {
    status: "public",
    dareId: "F78YH9HFSCMPRTGHM",
    dareText: "Let the darer play with your bare nipples for 2 minutes.",
    parentId: null,
    partnered: true,
    category: "foreplay",
    minInteraction: "physical",
    timer: 120000,
    tags: [{ id: 9, name: "nipple play" }],
    children: [
      {
        status: "public",
        dareId: "FBYHBDEFO9SUDNO98E",
        dareText: "Let the darer twist your nipples hard for 1 minute.",
        parentId: null,
        partnered: true,
        category: "kink",
        minInteraction: "physical",
        timer: 120000,
        tags: [{ id: 9, name: "nipple play" }],
        children: [],
      },
      {
        status: "public",
        dareId: "NCUW9BFUNZS9NBF3",
        dareText:
          "Let the darer play with your nipples through your clothes for 2 minutes.",
        parentId: null,
        partnered: true,
        category: "foreplay",
        minInteraction: "physical",
        timer: 120000,
        tags: [{ id: 9, name: "nipple play" }],
        children: [],
      },
    ],
  },
  {
    status: "private",
    dareId: "IBNV9UBNSDK8H9E3FN",
    dareText: "Perform a striptease for the group.",
    parentId: null,
    partnered: false,
    category: "flirty",
    minInteraction: "unsorted",
    timer: null,
    tags: [
      {
        id: 45,
        name: "stripping",
      },
      {
        id: 65,
        name: "clothes",
      },
      {
        id: 23,
        name: "dance",
      },
    ],
    children: [],
  },
  {
    status: "disabled",
    dareId: "RGNUI9BDNFO9S84",
    dareText: "Describe your most bizarre sex dream.",
    parentId: null,
    partnered: false,
    category: "truth",
    minInteraction: "chat",
    timer: null,
    tags: [
      {
        id: 67,
        name: "dream",
      },
    ],
    children: [],
  },
];
