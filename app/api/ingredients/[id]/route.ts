import { NextResponse } from "next/server";
import {
  deleteIngredient,
  updateIngredient,
} from "@/lib/data-store";
import { ingredientInputSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const validated = ingredientInputSchema.parse(body);
    const updated = await updateIngredient(params.id, validated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "食材更新に失敗しました",
      },
      { status },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await deleteIngredient(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "食材の削除に失敗しました" },
      { status: 500 },
    );
  }
}
