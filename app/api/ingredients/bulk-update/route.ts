import { NextResponse } from "next/server";
import { bulkUpdateIngredientQuantities } from "@/lib/data-store";
import { bulkQuantitySchema } from "@/lib/validation";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validated = bulkQuantitySchema.parse(body);
    const updated = await bulkUpdateIngredientQuantities(validated.items);
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "在庫の一括更新に失敗しました",
      },
      { status },
    );
  }
}
