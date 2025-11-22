import { NextResponse } from "next/server";
import { createSale, listSales } from "@/lib/data-store";
import { saleInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    const sales = await listSales();
    return NextResponse.json(sales);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "特売情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = saleInputSchema.parse(body);
    const created = await createSale(validated);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "特売情報の作成に失敗しました",
      },
      { status },
    );
  }
}
