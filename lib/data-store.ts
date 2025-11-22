import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { addDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import {
  FamilyMember,
  FamilyMemberPayload,
  Ingredient,
  IngredientPayload,
  Sale,
  SalePayload,
} from "@/types";
import { appConfig } from "./config";
import { getDocumentClient } from "./dynamo";

type QuantityUpdate = {
  id: string;
  quantity: number;
};

type MemoryStore = {
  ingredients: Map<string, Ingredient>;
  sales: Map<string, Sale>;
  familyProfiles: Map<string, FamilyMember>;
};

const memoryStore: MemoryStore = {
  ingredients: new Map(),
  sales: new Map(),
  familyProfiles: new Map(),
};

function calcDiscountedPrice(
  price: number,
  discountRate?: number,
): number | undefined {
  if (discountRate === undefined) return undefined;
  const discounted = Math.round(price * (1 - discountRate / 100));
  return discounted >= 0 ? discounted : 0;
}

function seedMemoryData() {
  if (!appConfig.useMockDb || memoryStore.ingredients.size > 0) {
    return;
  }

  const now = new Date();
  const isoNow = now.toISOString();

  const toDateString = (date: Date) => date.toISOString().slice(0, 10);

  const sampleIngredients: Ingredient[] = [
    {
      id: uuidv4(),
      name: "鶏むね肉",
      quantity: 2,
      unit: "枚",
      expiryDate: toDateString(addDays(now, 2)),
      category: "肉",
      memo: "照り焼き用",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: uuidv4(),
      name: "ブロッコリー",
      quantity: 1,
      unit: "株",
      expiryDate: toDateString(addDays(now, 1)),
      category: "野菜",
      memo: "",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: uuidv4(),
      name: "牛乳",
      quantity: 500,
      unit: "ml",
      expiryDate: toDateString(addDays(now, 4)),
      category: "乳製品",
      memo: "朝食用",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const sampleSales: Sale[] = [
    {
      id: uuidv4(),
      name: "国産豚こま切れ",
      price: 280,
      discountRate: 20,
      discountedPrice: 224,
      startDate: isoNow.slice(0, 10),
      endDate: toDateString(addDays(now, 3)),
      category: "肉",
      memo: "本日限り",
      storeName: "グリーンマート桜台店",
      storeSlug: "greengmart-sakuradai",
      storeUrl: "https://example.com/stores/greengmart-sakuradai",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: uuidv4(),
      name: "ほうれん草",
      price: 120,
      discountRate: 10,
      discountedPrice: 108,
      startDate: isoNow.slice(0, 10),
      endDate: toDateString(addDays(now, 5)),
      category: "野菜",
      memo: "",
      storeName: "オーガニックプラザ中央店",
      storeSlug: "organic-plaza-chuo",
      storeUrl: "https://example.com/stores/organic-plaza",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  sampleIngredients.forEach((item) =>
    memoryStore.ingredients.set(item.id, item),
  );
  sampleSales.forEach((sale) => memoryStore.sales.set(sale.id, sale));
  const sampleFamilies: FamilyMember[] = [
    {
      id: uuidv4(),
      name: "はると",
      lifeStage: "小学生",
      appetite: "普通",
      notes: "野菜少なめ",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: uuidv4(),
      name: "みさき",
      lifeStage: "高校生",
      appetite: "大食い",
      notes: "",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: uuidv4(),
      name: "父",
      lifeStage: "40代",
      appetite: "普通",
      notes: "魚好き",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  sampleFamilies.forEach((member) =>
    memoryStore.familyProfiles.set(member.id, member),
  );
}

seedMemoryData();

function sortIngredientsByExpiry(items: Ingredient[]): Ingredient[] {
  return [...items].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });
}

// Ingredient operations

export async function listIngredients(): Promise<Ingredient[]> {
  if (appConfig.useMockDb) {
    return sortIngredientsByExpiry(Array.from(memoryStore.ingredients.values()));
  }

  const client = getDocumentClient();
  const result = await client.send(
    new ScanCommand({
      TableName: appConfig.tableNames.ingredients,
    }),
  );
  const items = (result.Items as Ingredient[]) ?? [];
  return sortIngredientsByExpiry(items);
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
  if (appConfig.useMockDb) {
    return memoryStore.ingredients.get(id) ?? null;
  }

  const client = getDocumentClient();
  const result = await client.send(
    new GetCommand({
      TableName: appConfig.tableNames.ingredients,
      Key: { id },
    }),
  );
  return (result.Item as Ingredient | undefined) ?? null;
}

export async function createIngredient(
  payload: IngredientPayload,
): Promise<Ingredient> {
  const now = new Date().toISOString();
  const ingredient: Ingredient = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...payload,
  };

  if (appConfig.useMockDb) {
    memoryStore.ingredients.set(ingredient.id, ingredient);
    return ingredient;
  }

  const client = getDocumentClient();
  await client.send(
    new PutCommand({
      TableName: appConfig.tableNames.ingredients,
      Item: ingredient,
    }),
  );
  return ingredient;
}

export async function updateIngredient(
  id: string,
  payload: IngredientPayload,
): Promise<Ingredient> {
  const existing = await getIngredientById(id);
  if (!existing) {
    throw new Error("Ingredient not found");
  }
  const updated: Ingredient = {
    ...existing,
    ...payload,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (appConfig.useMockDb) {
    memoryStore.ingredients.set(id, updated);
    return updated;
  }

  const client = getDocumentClient();
  await client.send(
    new PutCommand({
      TableName: appConfig.tableNames.ingredients,
      Item: updated,
    }),
  );
  return updated;
}

export async function deleteIngredient(id: string): Promise<void> {
  if (appConfig.useMockDb) {
    memoryStore.ingredients.delete(id);
    return;
  }

  const client = getDocumentClient();
  await client.send(
    new DeleteCommand({
      TableName: appConfig.tableNames.ingredients,
      Key: { id },
    }),
  );
}

export async function bulkUpdateIngredientQuantities(
  updates: QuantityUpdate[],
): Promise<Ingredient[]> {
  const results: Ingredient[] = [];

  for (const update of updates) {
    const ingredient = await getIngredientById(update.id);
    if (!ingredient) continue;

    const next: Ingredient = {
      ...ingredient,
      quantity: update.quantity,
      updatedAt: new Date().toISOString(),
    };

    if (appConfig.useMockDb) {
      memoryStore.ingredients.set(next.id, next);
    } else {
      const client = getDocumentClient();
      await client.send(
        new PutCommand({
          TableName: appConfig.tableNames.ingredients,
          Item: next,
        }),
      );
    }

    results.push(next);
  }

  return results;
}

// Sales operations

export async function listSales(): Promise<Sale[]> {
  if (appConfig.useMockDb) {
    return Array.from(memoryStore.sales.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  const client = getDocumentClient();
  const result = await client.send(
    new ScanCommand({
      TableName: appConfig.tableNames.sales,
    }),
  );
  return (result.Items as Sale[]) ?? [];
}

async function getSaleById(id: string): Promise<Sale | null> {
  if (appConfig.useMockDb) {
    return memoryStore.sales.get(id) ?? null;
  }

  const client = getDocumentClient();
  const result = await client.send(
    new GetCommand({
      TableName: appConfig.tableNames.sales,
      Key: { id },
    }),
  );
  return (result.Item as Sale | undefined) ?? null;
}

export async function createSale(payload: SalePayload): Promise<Sale> {
  const now = new Date().toISOString();
  const sale: Sale = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...payload,
    discountedPrice: calcDiscountedPrice(
      payload.price,
      payload.discountRate,
    ),
  };

  if (appConfig.useMockDb) {
    memoryStore.sales.set(sale.id, sale);
    return sale;
  }

  const client = getDocumentClient();
  await client.send(
    new PutCommand({
      TableName: appConfig.tableNames.sales,
      Item: sale,
    }),
  );
  return sale;
}

export async function updateSale(id: string, payload: SalePayload): Promise<Sale> {
  const existing = await getSaleById(id);
  if (!existing) {
    throw new Error("Sale not found");
  }

  const updated: Sale = {
    ...existing,
    ...payload,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    discountedPrice: calcDiscountedPrice(
      payload.price,
      payload.discountRate,
    ),
  };

  if (appConfig.useMockDb) {
    memoryStore.sales.set(id, updated);
    return updated;
  }

  const client = getDocumentClient();
  await client.send(
    new PutCommand({
      TableName: appConfig.tableNames.sales,
      Item: updated,
    }),
  );
  return updated;
}

export async function deleteSale(id: string): Promise<void> {
  if (appConfig.useMockDb) {
    memoryStore.sales.delete(id);
    return;
  }

  const client = getDocumentClient();
  await client.send(
    new DeleteCommand({
      TableName: appConfig.tableNames.sales,
      Key: { id },
    }),
  );
}

// Family profile operations

export async function listFamilyMembers(): Promise<FamilyMember[]> {
  if (appConfig.useMockDb) {
    return Array.from(memoryStore.familyProfiles.values());
  }

  const client = getDocumentClient();
  const result = await client.send(
    new ScanCommand({
      TableName: appConfig.tableNames.familyProfiles,
    }),
  );
  return (result.Items as FamilyMember[]) ?? [];
}

async function getFamilyMemberById(id: string): Promise<FamilyMember | null> {
  if (appConfig.useMockDb) {
    return memoryStore.familyProfiles.get(id) ?? null;
  }

  const client = getDocumentClient();
  const result = await client.send(
    new GetCommand({
      TableName: appConfig.tableNames.familyProfiles,
      Key: { id },
    }),
  );
  return (result.Item as FamilyMember | undefined) ?? null;
}

export async function createFamilyMember(
  payload: FamilyMemberPayload,
): Promise<FamilyMember> {
  const now = new Date().toISOString();
  const member: FamilyMember = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...payload,
  };

  if (appConfig.useMockDb) {
    memoryStore.familyProfiles.set(member.id, member);
    return member;
  }

  const client = getDocumentClient();
  await client.send(
    new PutCommand({
      TableName: appConfig.tableNames.familyProfiles,
      Item: member,
    }),
  );
  return member;
}

export async function updateFamilyMember(
  id: string,
  payload: FamilyMemberPayload,
): Promise<FamilyMember> {
  const existing = await getFamilyMemberById(id);
  if (!existing) {
    throw new Error("Family member not found");
  }

  const updated: FamilyMember = {
    ...existing,
    ...payload,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (appConfig.useMockDb) {
    memoryStore.familyProfiles.set(id, updated);
    return updated;
  }

  const client = getDocumentClient();
  await client.send(
    new PutCommand({
      TableName: appConfig.tableNames.familyProfiles,
      Item: updated,
    }),
  );
  return updated;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  if (appConfig.useMockDb) {
    memoryStore.familyProfiles.delete(id);
    return;
  }

  const client = getDocumentClient();
  await client.send(
    new DeleteCommand({
      TableName: appConfig.tableNames.familyProfiles,
      Key: { id },
    }),
  );
}
