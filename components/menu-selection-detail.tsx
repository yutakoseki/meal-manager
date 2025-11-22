"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  Ingredient,
  MenuSuggestion,
  Sale,
  UsedIngredient,
} from "@/types";
import { apiRequest } from "@/lib/client";

function findIngredient(
  list: Ingredient[],
  used: UsedIngredient,
): Ingredient | undefined {
  if (used.ingredientId) {
    return list.find((item) => item.id === used.ingredientId);
  }
  return list.find((item) => item.name === used.name);
}

function nextQuantity(
  ingredient: Ingredient | undefined,
  used: UsedIngredient,
): number {
  if (!ingredient) return used.usedQuantity;
  return Number(
    Math.max(0, ingredient.quantity - used.usedQuantity).toFixed(2),
  );
}

function isSaleActive(sale: Sale, today: string): boolean {
  const afterStart = !sale.startDate || sale.startDate <= today;
  const beforeEnd = !sale.endDate || sale.endDate >= today;
  return afterStart && beforeEnd;
}

function pickBestSale(
  item: UsedIngredient,
  stock: Ingredient | undefined,
  activeSales: Sale[],
): Sale | undefined {
  const normalized = item.name.toLowerCase();
  const normalizedCategory = stock?.category?.toLowerCase();

  const byName = activeSales.find((sale) =>
    sale.name.toLowerCase().includes(normalized) ||
    normalized.includes(sale.name.toLowerCase()),
  );
  if (byName) return byName;

  if (normalizedCategory) {
    const byCategory = activeSales.find(
      (sale) =>
        sale.category &&
        sale.category.toLowerCase().includes(normalizedCategory),
    );
    if (byCategory) return byCategory;
  }

  return undefined;
}

function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function deriveStoreSlug(sale: Sale): string | null {
  if (sale.storeSlug) return sale.storeSlug;
  if (sale.storeUrl) {
    try {
      const parsed = new URL(sale.storeUrl);
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
    } catch {
      // ignore parse errors
    }
  }
  if (sale.storeName) return toSlug(sale.storeName);
  return null;
}

export function MenuSelectionDetail() {
  const router = useRouter();
  const [selection, setSelection] = useState<MenuSuggestion | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryDraft, setInventoryDraft] = useState<Record<string, string>>({});
  const [inventorySaving, setInventorySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("meal-manager:selectedMenu");
    if (!raw) {
      setMessage("採用された献立が見つかりませんでした。もう一度提案してください。");
      setLoading(false);
      return;
    }
    try {
      const parsed: MenuSuggestion = JSON.parse(raw);
      setSelection(parsed);
    } catch (error) {
      console.error(error);
      setMessage("献立情報の読み込みに失敗しました。再度提案してください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [ingredientData, salesData] = await Promise.all([
          apiRequest<Ingredient[]>("/api/ingredients"),
          apiRequest<Sale[]>("/api/sales"),
        ]);
        setIngredients(ingredientData);
        setSales(salesData);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "在庫・特売情報の取得に失敗しました",
        );
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selection) return;
    const draft: Record<string, string> = {};
    selection.usedIngredients.forEach((used) => {
      const match = findIngredient(ingredients, used);
      const key = used.ingredientId ?? match?.id;
      if (!key) return;
      draft[key] = String(nextQuantity(match, used));
    });
    setInventoryDraft(draft);
  }, [selection, ingredients]);

  const activeSales = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sales.filter((sale) => isSaleActive(sale, today));
  }, [sales]);

  const missingIngredients = useMemo(
    () =>
      selection
        ? (selection.usedIngredients
            .map((item) => {
              const stock = findIngredient(ingredients, item);
              const shortage = Math.max(
                0,
                Number(
                  (item.usedQuantity - (stock?.quantity ?? 0)).toFixed(2),
                ),
              );
              if (shortage <= 0) return null;
              const matchedSale = pickBestSale(item, stock, activeSales);
              return {
                ...item,
                shortage,
                sale: matchedSale,
                category: stock?.category,
              };
            })
            .filter(Boolean) as Array<
            UsedIngredient & { shortage: number; sale?: Sale; category?: string }
          >)
        : [],
    [selection, ingredients, activeSales],
  );

  async function updateInventory() {
    if (!selection) return;
    const updates = selection.usedIngredients
      .map((item) => {
        const match = findIngredient(ingredients, item);
        const id = item.ingredientId ?? match?.id;
        if (!id) return null;
        const value = inventoryDraft[id];
        const quantity =
          value !== undefined ? Number(value) : nextQuantity(match, item);
        if (Number.isNaN(quantity) || quantity < 0) return null;
        return { id, quantity };
      })
      .filter(Boolean) as Array<{ id: string; quantity: number }>;

    if (updates.length === 0) {
      setMessage("在庫更新対象の食材がありません。");
      return;
    }

    setInventorySaving(true);
    setMessage(null);
    try {
      await apiRequest("/api/ingredients/bulk-update", {
        method: "PUT",
        body: JSON.stringify({ items: updates }),
      });
      setMessage("在庫を更新しました。");
      const refreshed = await apiRequest<Ingredient[]>("/api/ingredients");
      setIngredients(refreshed);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "在庫更新に失敗しました",
      );
    } finally {
      setInventorySaving(false);
    }
  }

  function handleInventoryChange(id: string, value: string) {
    setInventoryDraft((prev) => ({ ...prev, [id]: value }));
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">読み込み中...</p>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-amber-800">
          {message ?? "採用された献立が見つかりません。"}
        </p>
        <Link
          href="/menu"
          className="inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm text-white"
        >
          献立提案に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-emerald-700">献立採用</p>
            <h1 className="text-xl font-semibold">{selection.menuTitle}</h1>
            <p className="mt-1 text-sm text-zinc-600">{selection.description}</p>
            <p className="text-xs text-emerald-700">
              {selection.nutritionComment}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/menu")}
            className="rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700"
          >
            提案に戻る
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        )}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="space-y-4 rounded-2xl border border-zinc-100 p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-zinc-700">使用食材</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                {selection.usedIngredients.map((item) => (
                  <li key={item.name + item.usedQuantity}>
                    {item.name}: {item.usedQuantity}
                    {item.unit && ` ${item.unit}`}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700">レシピ</p>
              <ol className="mt-2 space-y-2 list-decimal pl-5 text-sm text-zinc-700">
                {selection.recipeSteps.map((step, index) => (
                  <li key={index} className="pl-1">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700">
                足りない材料と特売情報
              </p>
              {missingIngredients.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">
                  足りない材料はありません。今ある在庫だけで調理できます。
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {missingIngredients.map((item) => {
                    const slug = item.sale ? deriveStoreSlug(item.sale) : null;
                    const href =
                      slug && item.sale
                        ? `/stores/${slug}?product=${encodeURIComponent(item.sale.name)}`
                        : undefined;
                    return (
                      <li key={item.name}>
                        {item.sale && href ? (
                          <Link
                            href={href}
                            className="block rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                          >
                            <p className="font-semibold">
                              {item.name} を {item.shortage}
                              {item.unit && ` ${item.unit}`} 追加購入してください。
                            </p>
                            <div className="mt-2 space-y-1 rounded-lg bg-white/70 p-3 text-emerald-900">
                              <p className="text-xs font-semibold text-emerald-800">
                                特売: {item.sale.name} / ￥{item.sale.price}
                                {item.sale.discountRate
                                  ? ` (${item.sale.discountRate}% off)`
                                  : ""}
                                {item.sale.endDate ? ` 〜 ${item.sale.endDate}` : ""}
                              </p>
                              {(item.sale.storeName || item.sale.storeUrl) && (
                                <p className="text-xs text-emerald-700">
                                  {item.sale.storeName ?? "店舗情報あり"}
                                  {" （クリックで店舗特売ページへ）"}
                                </p>
                              )}
                            </div>
                          </Link>
                        ) : item.sale ? (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                            <p className="font-semibold">
                              {item.name} を {item.shortage}
                              {item.unit && ` ${item.unit}`} 追加購入してください。
                            </p>
                            <div className="mt-2 space-y-1 rounded-lg bg-white/70 p-3 text-emerald-900">
                              <p className="text-xs font-semibold text-emerald-800">
                                特売: {item.sale.name} / ￥{item.sale.price}
                                {item.sale.discountRate
                                  ? ` (${item.sale.discountRate}% off)`
                                  : ""}
                                {item.sale.endDate ? ` 〜 ${item.sale.endDate}` : ""}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                            <p className="font-semibold">
                              {item.name} を {item.shortage}
                              {item.unit && ` ${item.unit}`} 追加購入してください。
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              一致する特売情報はありません。スーパーで確認してください。
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </article>

          <article className="space-y-3 rounded-2xl border border-zinc-100 p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-zinc-700">在庫を差し引く</p>
              <p className="text-xs text-zinc-500">
                レシピで使う量を反映し、冷蔵庫の在庫を最新化します。
              </p>
            </div>
            {selection.usedIngredients.map((item) => {
              const ingredient = findIngredient(ingredients, item);
              const id = item.ingredientId ?? item.name;
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-zinc-100 p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-zinc-700">{item.name}</p>
                  <div className="mt-2 flex flex-col gap-2 text-sm">
                    <span className="text-zinc-600">
                      使用量: {item.usedQuantity}
                      {item.unit && ` ${item.unit}`}
                    </span>
                    {ingredient && item.ingredientId ? (
                      <>
                        <span className="text-xs text-zinc-500">
                          現在の在庫: {ingredient.quantity}
                          {ingredient.unit && ` ${ingredient.unit}`}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          className="w-full rounded-lg border px-3 py-2"
                          value={inventoryDraft[item.ingredientId] ?? ""}
                          onChange={(event) =>
                            handleInventoryChange(
                              item.ingredientId as string,
                              event.target.value,
                            )
                          }
                        />
                      </>
                    ) : (
                      <span className="text-xs text-amber-700">
                        在庫未登録の食材です。購入後に登録してください。
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={updateInventory}
                disabled={inventorySaving}
                className="rounded-full bg-emerald-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {inventorySaving ? "更新中..." : "在庫を更新"}
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
