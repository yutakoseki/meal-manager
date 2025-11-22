import { z } from "zod";
import { INGREDIENT_CATEGORIES } from "@/types";
import { APPETITE_OPTIONS, LIFE_STAGE_OPTIONS } from "./portion";

export const ingredientInputSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  quantity: z.number().min(0, "数量は0以上で入力してください"),
  unit: z.string().optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  memo: z.string().optional(),
});

export const saleInputSchema = z.object({
  name: z.string().min(1, "商品名は必須です"),
  price: z.number().min(0, "価格は0以上です"),
  discountRate: z.number().min(0).max(100).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  category: z.string().optional(),
  memo: z.string().optional(),
});

export const familyMemberSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  lifeStage: z.enum(LIFE_STAGE_OPTIONS),
  appetite: z.enum(APPETITE_OPTIONS),
  notes: z.string().optional(),
});

export const bulkQuantitySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.number().min(0),
      }),
    )
    .min(1),
});
