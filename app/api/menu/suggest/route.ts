import { NextResponse } from "next/server";
import { z } from "zod";
import {
  Ingredient,
  MenuSuggestion,
  MenuSuggestionRequest,
  Sale,
  UsedIngredient,
} from "@/types";
import { APPETITE_OPTIONS, LIFE_STAGE_OPTIONS, getPortionFactor } from "@/lib/portion";

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  expiryDate: z.string().optional(),
  category: z.string().optional(),
  memo: z.string().optional(),
});

const saleSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  discountRate: z.number().optional(),
  discountedPrice: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  memo: z.string().optional(),
});

const familyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  lifeStage: z.enum(LIFE_STAGE_OPTIONS),
  appetite: z.enum(APPETITE_OPTIONS),
});

const requestSchema = z.object({
  ingredients: z.array(ingredientSchema).default([]),
  sales: z.array(saleSchema).default([]),
  familyMembers: z.array(familyMemberSchema).default([]),
});

function isSaleActive(sale: Sale, today: string): boolean {
  const afterStart = !sale.startDate || sale.startDate <= today;
  const beforeEnd = !sale.endDate || sale.endDate >= today;
  return afterStart && beforeEnd;
}

function isProtein(ingredient: Ingredient): boolean {
  const category = ingredient.category ?? "";
  return (
    ["肉", "魚", "卵", "豆", "肉類", "魚介"].some((label) =>
      category.includes(label),
    ) || /chicken|pork|beef|fish|egg|tofu/i.test(ingredient.name)
  );
}

function isVegetable(ingredient: Ingredient): boolean {
  const category = ingredient.category ?? "";
  return (
    ["野菜", "根菜", "きのこ"].some((label) => category.includes(label)) ||
    /lettuce|spinach|carrot|broccoli|cabbage|onion/i.test(ingredient.name)
  );
}

function isStaple(ingredient: Ingredient): boolean {
  const category = ingredient.category ?? "";
  return (
    ["主食", "穀類"].some((label) => category.includes(label)) ||
    /rice|ご飯|パン|麺|うどん|パスタ/i.test(ingredient.name)
  );
}

function makeUsedIngredient(
  source: Ingredient,
  ratio: number,
  portionScale: number,
): UsedIngredient {
  const used = Math.min(
    source.quantity,
    Math.max(0.1, Number((source.quantity * ratio * portionScale).toFixed(2))),
  );
  return {
    ingredientId: source.id,
    name: source.name,
    usedQuantity: Number(used.toFixed(2)),
    unit: source.unit,
  };
}

function buildNutritionComment(ingredients: Ingredient[]): string {
  const proteins = ingredients.filter(isProtein).length;
  const veggies = ingredients.filter(isVegetable).length;
  if (proteins && veggies) {
    return "たんぱく質と野菜のバランスが取れた献立です";
  }
  if (veggies > 1) {
    return "野菜多めでビタミン補給を意識しました";
  }
  if (proteins) {
    return "成長期の子供向けにたんぱく質を強化しています";
  }
  return "不足しがちな食材を組み合わせた提案です";
}

function buildMenuSuggestions(request: MenuSuggestionRequest): MenuSuggestion[] {
  const today = new Date().toISOString().slice(0, 10);
  const portionTotal = request.familyMembers.length
    ? request.familyMembers.reduce(
        (sum, member) => sum + getPortionFactor(member),
        0,
      )
    : 2;
  const portionScale = Math.max(0.6, Number((portionTotal / 2).toFixed(2)));

  const safeIngredients = request.ingredients;

  const sorted = [...safeIngredients].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });

  const proteins = sorted.filter(isProtein);
  const veggies = sorted.filter(isVegetable);
  const staples = sorted.filter(isStaple);
  const dairy = sorted.filter((ingredient) =>
    (ingredient.category ?? "").includes("乳"),
  );

  const activeSales = request.sales.filter((sale) =>
    isSaleActive(sale, today),
  );

  const suggestions: MenuSuggestion[] = [];

  if (proteins.length && veggies.length) {
    const used = [
      makeUsedIngredient(proteins[0], 0.6, portionScale),
      makeUsedIngredient(veggies[0], 0.8, portionScale),
    ];
    if (staples[0]) {
      used.push(makeUsedIngredient(staples[0], 0.4, portionScale));
    }
    const involvedIngredients = [proteins[0], veggies[0], staples[0]].filter(
      Boolean,
    ) as Ingredient[];

    suggestions.push({
      id: crypto.randomUUID(),
      menuTitle: "鶏肉と野菜の照り焼きプレート",
      description:
        "メインのたんぱく質と野菜、副菜、主食をワンプレートにまとめた献立です。",
      nutritionComment: buildNutritionComment(involvedIngredients),
      usedIngredients: used,
    });
  }

  if (activeSales.length && sorted.length) {
    const sale = activeSales[0];
    const match =
      sorted.find((item) =>
        (item.category ?? "").includes(sale.category ?? ""),
      ) ?? sorted[0];
    suggestions.push({
      id: crypto.randomUUID(),
      menuTitle: `${sale.name}で作るお得なメイン`,
      description: `特売の「${sale.name}」を活用し、節約しつつボリュームを確保します。`,
      nutritionComment: "特売品でコスパ良くたんぱく質を確保できます",
      usedIngredients: [makeUsedIngredient(match, 0.7, portionScale)],
    });
  }

  if (veggies.length > 1 || dairy.length) {
    const usedSources: Ingredient[] = [];
    if (veggies[0]) usedSources.push(veggies[0]);
    if (veggies[1]) usedSources.push(veggies[1]);
    if (dairy[0]) usedSources.push(dairy[0]);

    suggestions.push({
      id: crypto.randomUUID(),
      menuTitle: "野菜たっぷりミルクスープ",
      description: "乳製品と野菜を合わせた優しい味のスープで栄養を補います。",
      nutritionComment: buildNutritionComment(usedSources),
      usedIngredients: usedSources.map((ingredient) =>
        makeUsedIngredient(ingredient, 0.5, portionScale),
      ),
    });
  }

  if (suggestions.length === 0 && sorted.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      menuTitle: `${sorted[0].name}を使ったクイックメニュー`,
      description: "賞味期限が近い食材を優先的に消費する献立です。",
      nutritionComment: buildNutritionComment([sorted[0]]),
      usedIngredients: [makeUsedIngredient(sorted[0], 0.5, portionScale)],
    });
  }

  return suggestions.slice(0, 3);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);
    const suggestions = buildMenuSuggestions(
      payload as MenuSuggestionRequest,
    );
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "献立提案に失敗しました",
      },
      { status },
    );
  }
}
