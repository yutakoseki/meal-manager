import { NextResponse } from "next/server";
import { createIngredient, listIngredients } from "@/lib/data-store";
import { ingredientInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    const ingredients = await listIngredients();
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "食材一覧の取得に失敗しました" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = ingredientInputSchema.parse(body);
    const created = await createIngredient(validated);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "食材追加に失敗しました" },
      { status },
    );
  }
}
