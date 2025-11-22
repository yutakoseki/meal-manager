export type UUID = string;

export const INGREDIENT_CATEGORIES = [
  "肉",
  "魚",
  "野菜",
  "果物",
  "乳製品",
  "卵",
  "穀物",
  "豆・乾物",
  "調味料",
  "その他",
] as const;

export interface Ingredient {
  id: UUID;
  name: string;
  quantity: number;
  unit?: string;
  expiryDate?: string;
  category?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export type IngredientPayload = Omit<
  Ingredient,
  "id" | "createdAt" | "updatedAt"
>;

export interface Sale {
  id: UUID;
  name: string;
  price: number;
  discountRate?: number;
  discountedPrice?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export type SalePayload = Omit<Sale, "id" | "createdAt" | "updatedAt">;

export type LifeStage =
  | "乳幼児"
  | "小学生"
  | "中学生"
  | "高校生"
  | "大学生"
  | "20代"
  | "30代"
  | "40代"
  | "50代"
  | "60代以上";

export type AppetiteLevel = "小食" | "普通" | "大食い";

export interface FamilyMember {
  id: UUID;
  name: string;
  lifeStage: LifeStage;
  appetite: AppetiteLevel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FamilyMemberPayload = Omit<
  FamilyMember,
  "id" | "createdAt" | "updatedAt"
>;

export interface UsedIngredient {
  ingredientId?: string;
  name: string;
  usedQuantity: number;
  unit?: string;
}

export interface MenuSuggestion {
  id: string;
  menuTitle: string;
  description: string;
  nutritionComment: string;
  usedIngredients: UsedIngredient[];
}

export interface MenuSuggestionRequest {
  ingredients: Ingredient[];
  sales: Sale[];
  familyMembers: Array<
    Pick<FamilyMember, "id" | "name" | "lifeStage" | "appetite">
  >;
}
