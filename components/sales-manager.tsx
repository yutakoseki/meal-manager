"use client";

import { useEffect, useMemo, useState } from "react";
import type { Sale } from "@/types";
import { apiRequest } from "@/lib/client";

type SaleFormState = {
  name: string;
  price: string;
  discountRate: string;
  startDate: string;
  endDate: string;
  category: string;
  memo: string;
};

const emptySaleForm: SaleFormState = {
  name: "",
  price: "",
  discountRate: "",
  startDate: "",
  endDate: "",
  category: "",
  memo: "",
};

export function SalesManager() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [formState, setFormState] = useState<SaleFormState>(emptySaleForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      setLoading(true);
      const data = await apiRequest<Sale[]>("/api/sales");
      setSales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(sale: Sale) {
    setEditingId(sale.id);
    setFormState({
      name: sale.name,
      price: String(sale.price),
      discountRate: sale.discountRate ? String(sale.discountRate) : "",
      startDate: sale.startDate ?? "",
      endDate: sale.endDate ?? "",
      category: sale.category ?? "",
      memo: sale.memo ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setFormState(emptySaleForm);
  }

  const computedDiscountedPrice = useMemo(() => {
    const price = Number(formState.price);
    const rate = Number(formState.discountRate);
    if (Number.isNaN(price) || Number.isNaN(rate) || rate <= 0) return "";
    const value = Math.max(0, Math.round(price * (1 - rate / 100)));
    return String(value);
  }, [formState.price, formState.discountRate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: formState.name.trim(),
      price: Number(formState.price),
      discountRate: formState.discountRate
        ? Number(formState.discountRate)
        : undefined,
      startDate: formState.startDate || undefined,
      endDate: formState.endDate || undefined,
      category: formState.category.trim() || undefined,
      memo: formState.memo.trim() || undefined,
    };

    try {
      if (!payload.name) throw new Error("商品名を入力してください。");
      if (Number.isNaN(payload.price) || payload.price < 0) {
        throw new Error("価格は0以上で入力してください。");
      }
      if (
        payload.discountRate !== undefined &&
        (payload.discountRate < 0 || payload.discountRate > 100)
      ) {
        throw new Error("割引率は0〜100の範囲で入力してください。");
      }
      if (editingId) {
        await apiRequest(`/api/sales/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/sales", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadSales();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この特売情報を削除しますか？")) return;
    try {
      await apiRequest(`/api/sales/${id}`, { method: "DELETE" });
      await loadSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">特売情報の登録</h2>
            <p className="text-sm text-zinc-500">
              割引率または割引後価格は任意入力です。
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
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            商品名 *
            <input
              name="name"
              value={formState.name}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
              placeholder="例: 国産豚こま切れ"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            価格 *
            <input
              type="number"
              min={0}
              step="1"
              name="price"
              value={formState.price}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
              placeholder="例: 280"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            割引率 (%)
            <input
              type="number"
              min={0}
              max={100}
              step="1"
              name="discountRate"
              value={formState.discountRate}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span>割引後価格</span>
            <div className="rounded-lg border px-3 py-2 text-zinc-700">
              {computedDiscountedPrice
                ? `${computedDiscountedPrice} 円`
                : "割引率入力で自動計算"}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            開始日
            <input
              type="date"
              name="startDate"
              value={formState.startDate}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            終了日
            <input
              type="date"
              name="endDate"
              value={formState.endDate}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            カテゴリ
            <input
              name="category"
              value={formState.category}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2"
              placeholder="肉 / 野菜 など"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            メモ
            <textarea
              name="memo"
              value={formState.memo}
              onChange={handleChange}
              className="min-h-[80px] rounded-lg border px-3 py-2"
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
              {editingId ? "特売を更新" : "特売を追加"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">特売リスト</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        ) : sales.length === 0 ? (
          <p className="text-sm text-zinc-500">登録されている特売情報がありません。</p>
        ) : (
          <div className="grid gap-4">
            {sales.map((sale) => (
              <article
                key={sale.id}
                className="rounded-2xl border border-zinc-100 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{sale.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {sale.category ?? "カテゴリ未設定"}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 hover:bg-zinc-50"
                      onClick={() => startEdit(sale)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(sale.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">価格</dt>
                    <dd className="font-semibold">{sale.price} 円</dd>
                  </div>
                  {sale.discountRate !== undefined && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">割引率</dt>
                      <dd>{sale.discountRate}% OFF</dd>
                    </div>
                  )}
                  {sale.discountedPrice !== undefined && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">割引後価格</dt>
                      <dd className="font-semibold text-emerald-700">
                        {sale.discountedPrice} 円
                      </dd>
                    </div>
                  )}
                  {(sale.startDate || sale.endDate) && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">期間</dt>
                      <dd>
                        {sale.startDate ?? "未設定"} ~ {sale.endDate ?? "未設定"}
                      </dd>
                    </div>
                  )}
                  {sale.memo && (
                    <div>
                      <dt className="text-zinc-500">メモ</dt>
                      <dd>{sale.memo}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
