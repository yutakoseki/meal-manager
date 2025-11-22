"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ingredient } from "@/types";
import { INGREDIENT_CATEGORIES } from "@/types";
import { apiRequest } from "@/lib/client";

type IngredientFormState = {
  name: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  category: string;
  memo: string;
};

const emptyForm: IngredientFormState = {
  name: "",
  quantity: "",
  unit: "",
  expiryDate: "",
  category: "",
  memo: "",
};

export function FridgeManager() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formState, setFormState] = useState<IngredientFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const expiringSoon = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return ingredients.filter(
      (item) => item.expiryDate && item.expiryDate <= today,
    );
  }, [ingredients]);

  async function loadIngredients() {
    try {
      setLoading(true);
      const data = await apiRequest<Ingredient[]>("/api/ingredients");
      setIngredients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(ingredient: Ingredient) {
    setEditingId(ingredient.id);
    setFormState({
      name: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit ?? "",
      expiryDate: ingredient.expiryDate ?? "",
      category: ingredient.category ?? "",
      memo: ingredient.memo ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setFormState(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      name: formState.name.trim(),
      quantity: Number(formState.quantity),
      unit: formState.unit.trim() || undefined,
      expiryDate: formState.expiryDate || undefined,
      category: formState.category.trim() || undefined,
      memo: formState.memo.trim() || undefined,
    };

    try {
      if (!payload.name) {
        throw new Error("食材名を入力してください。");
      }
      if (Number.isNaN(payload.quantity) || payload.quantity < 0) {
        throw new Error("数量は0以上の数値で入力してください。");
      }

      if (editingId) {
        await apiRequest<Ingredient>(`/api/ingredients/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<Ingredient>("/api/ingredients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadIngredients();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この食材を削除しますか？")) {
      return;
    }
    try {
      await apiRequest(`/api/ingredients/${id}`, { method: "DELETE" });
      await loadIngredients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">食材を管理</h2>
            <p className="text-sm text-zinc-500">
              必須項目は名前と数量です。賞味期限は YYYY-MM-DD 形式で入力します。
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-emerald-600 underline"
            >
              新規追加に戻る
            </button>
          )}
        </div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            名前 *
            <input
              name="name"
              value={formState.name}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
              placeholder="例: 鶏もも肉"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            数量 *
            <input
              type="number"
              min={0}
              step="0.1"
              name="quantity"
              value={formState.quantity}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
              placeholder="例: 2"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            単位
            <input
              name="unit"
              value={formState.unit}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
              placeholder="個 / g / ml"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            賞味期限
            <input
              type="date"
              name="expiryDate"
              value={formState.expiryDate}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            カテゴリ
            <select
              name="category"
              value={formState.category}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">選択してください</option>
              {INGREDIENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            メモ
            <textarea
              name="memo"
              value={formState.memo}
              onChange={handleChange}
              className="min-h-[80px] rounded-lg border px-3 py-2"
              placeholder="用途や注意事項など"
            />
          </label>
          {error && (
            <p className="md:col-span-2 text-sm text-red-600">{error}</p>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-emerald-600 px-5 py-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {editingId ? "食材を更新" : "食材を追加"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">冷蔵庫の在庫</h2>
            <p className="text-sm text-zinc-500">スマホでも見やすいカード表示。</p>
          </div>
          {expiringSoon.length > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              ⚠︎ 期限間近 {expiringSoon.length} 件
            </span>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        ) : ingredients.length === 0 ? (
          <p className="text-sm text-zinc-500">登録されている食材がありません。</p>
        ) : (
          <div className="space-y-3">
            {ingredients.map((ingredient) => (
              <article
                key={ingredient.id}
                className="rounded-2xl border border-zinc-100 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-500">{ingredient.category ?? "カテゴリ未設定"}</p>
                    <h3 className="text-base font-semibold">{ingredient.name}</h3>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700"
                      onClick={() => startEdit(ingredient)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-red-600"
                      onClick={() => handleDelete(ingredient.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-800">
                    {ingredient.quantity}
                    {ingredient.unit && ` ${ingredient.unit}`}
                  </span>
                  <span>
                    賞味期限:{" "}
                    <span
                      className={
                        ingredient.expiryDate &&
                        ingredient.expiryDate <= new Date().toISOString().slice(0, 10)
                          ? "text-amber-600"
                          : ""
                      }
                    >
                      {ingredient.expiryDate ?? "-"}
                    </span>
                  </span>
                  {ingredient.memo && <span>メモ: {ingredient.memo}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
