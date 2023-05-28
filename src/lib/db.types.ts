import { z } from "zod";

export const TagSchema = z.object({
  id: z.number().int(),
  name: z
    .string()
    .trim()
    .toLowerCase()
    .max(30, { message: "Max characters: 30" }),
});

export type Tag = z.infer<typeof TagSchema>;

export const DARE_STATUS = z.enum(["pending", "public", "private", "disabled"]);
export type DareStatus = z.infer<typeof DARE_STATUS>;

export const CATEGORY = z.enum([
  "kink",
  "sex",
  "foreplay",
  "flirty",
  "truth",
  "unsorted",
]);
export type Category = z.infer<typeof CATEGORY>;

export const INTERACTION = z.enum([
  "unmasked",
  "physical",
  "video",
  "audio",
  "chat",
  "unsorted",
]);
export type Interaction = z.infer<typeof INTERACTION>;

export const GameDareSchema = z.object({
  dareId: z.string().cuid(),
  dareText: z.string().max(700, { message: "Dare text max 700 characters" }),
});

export const DefaultDbDareSchema = GameDareSchema.extend({
  parentId: z.string().nullable(),
  status: DARE_STATUS,
  partnered: z.boolean(),
  category: CATEGORY,
  minInteraction: INTERACTION,
  timer: z.number().int().nullable(),
});

export type DefaultDbDare = z.infer<typeof DefaultDbDareSchema>;

export const DareWithTagsSchema = DefaultDbDareSchema.extend({
  tags: TagSchema.array(),
});

export type DareWithTags = z.infer<typeof DareWithTagsSchema>;

export type DareWithChildren = DareWithTags & { children: DareWithChildren[] };

export const DareWithChildrenSchema: z.ZodType<DareWithChildren> =
  DareWithTagsSchema.extend({
    children: z.lazy(() => DareWithChildrenSchema.array()),
  });

export const DareDbInputSchema = GameDareSchema.partial({
  dareId: true,
}).extend({
  partnered: z.boolean(),
  status: DARE_STATUS.optional(),
  category: CATEGORY.optional(),
  minInteraction: INTERACTION.optional(),
  timer: z.number().int().nullable().optional(),
  parentId: z.string().nullable().optional(),
  children: GameDareSchema.shape.dareId.array().optional(),
  tags: TagSchema.shape.name.array().optional(),
});

export type DareDbInput = z.infer<typeof DareDbInputSchema>;

export type NewDareState = {
  saving: boolean;
  saved: boolean;
  removed: boolean;
};
