import { GameDareSchema } from "./gametypes";
import { z } from "zod";

export const TagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const DARE_STATUS = z.enum(["pending", "active", "disabled"]);
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

export const DefaultDbDareSchema = GameDareSchema.extend({
  parentId: z.string().nullable(),
  status: DARE_STATUS,
  partnered: z.boolean(),
  category: CATEGORY,
  minInteraction: INTERACTION,
  timer: z.number().int().nullable(),
});

export type DefaultDbDare = z.infer<typeof DefaultDbDareSchema>;

export const DareDbOutputSchema = DefaultDbDareSchema.extend({
  tags: TagSchema.shape.name.array(),
  children: GameDareSchema.shape.dareId.array(),
});

export type DareDbOutput = z.infer<typeof DareDbOutputSchema>;

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
