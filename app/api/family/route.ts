import { NextResponse } from "next/server";
import {
  createFamilyMember,
  listFamilyMembers,
} from "@/lib/data-store";
import { familyMemberSchema } from "@/lib/validation";

export async function GET() {
  try {
    const members = await listFamilyMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "家族プロフィールの取得に失敗しました" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = familyMemberSchema.parse(body);
    const created = await createFamilyMember(validated);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "家族プロフィールの登録に失敗しました",
      },
      { status },
    );
  }
}
