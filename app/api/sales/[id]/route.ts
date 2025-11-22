import { NextRequest, NextResponse } from "next/server";
import { deleteSale, updateSale } from "@/lib/data-store";
import { saleInputSchema } from "@/lib/validation";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = saleInputSchema.parse(body);
    const updated = await updateSale(id, validated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "特売情報の更新に失敗しました",
      },
      { status },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await deleteSale(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "特売情報の削除に失敗しました" },
      { status: 500 },
    );
  }
}
