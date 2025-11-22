"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FamilyMember, Ingredient, MenuSuggestion, Sale } from "@/types";
import { apiRequest } from "@/lib/client";
import { APPETITE_OPTIONS, LIFE_STAGE_OPTIONS } from "@/lib/portion";

type FamilyFormState = {
  name: string;
  lifeStage: string;
  appetite: string;
  notes: string;
};

const emptyFamilyForm: FamilyFormState = {
  name: "",
  lifeStage: "",
  appetite: "普通",
  notes: "",
};

export function MenuPlanner() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyForm, setFamilyForm] = useState<FamilyFormState>(emptyFamilyForm);
  const [familyEditingId, setFamilyEditingId] = useState<string | null>(null);
  const [familySaving, setFamilySaving] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<MenuSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        setDataLoading(true);
        const [ingredientData, salesData, familyData] = await Promise.all([
          apiRequest<Ingredient[]>("/api/ingredients"),
          apiRequest<Sale[]>("/api/sales"),
          apiRequest<FamilyMember[]>("/api/family"),
        ]);
        setIngredients(ingredientData);
        setSales(salesData);
        setFamilyMembers(familyData);
        setSelectedFamilyIds(familyData.map((member) => member.id));
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "初期データの取得に失敗しました",
        );
      } finally {
        setDataLoading(false);
      }
    }

    loadInitial();
  }, []);

  const selectedFamilies = useMemo(
    () => familyMembers.filter((member) => selectedFamilyIds.includes(member.id)),
    [familyMembers, selectedFamilyIds],
  );

  const selectedSummary = useMemo(() => {
    if (selectedFamilies.length === 0) return "参加者未選択";
    return selectedFamilies.map((member) => member.name).join("、");
  }, [selectedFamilies]);

  function handleFamilyChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setFamilyForm((prev) => ({ ...prev, [name]: value }));
  }

  function startFamilyEdit(member: FamilyMember) {
    setFamilyEditingId(member.id);
    setFamilyForm({
      name: member.name,
      lifeStage: member.lifeStage,
      appetite: member.appetite,
      notes: member.notes ?? "",
    });
  }

  function resetFamilyForm() {
    setFamilyEditingId(null);
    setFamilyForm(emptyFamilyForm);
  }

  async function saveFamilyMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFamilyError(null);
    setFamilySaving(true);

    const payload = {
      name: familyForm.name.trim(),
      lifeStage: familyForm.lifeStage as FamilyMember["lifeStage"],
      appetite: (familyForm.appetite as FamilyMember["appetite"]) ?? "普通",
      notes: familyForm.notes.trim() || undefined,
    };

    try {
      if (!payload.name) throw new Error("名前を入力してください。");
      if (!payload.lifeStage) throw new Error("ライフステージを選択してください。");
      const url = familyEditingId
        ? `/api/family/${familyEditingId}`
        : "/api/family";
      const method = familyEditingId ? "PUT" : "POST";
      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });
      const refreshed = await apiRequest<FamilyMember[]>("/api/family");
      setFamilyMembers(refreshed);
      if (!familyEditingId) {
        setSelectedFamilyIds(refreshed.map((member) => member.id));
      }
      resetFamilyForm();
    } catch (error) {
      setFamilyError(
        error instanceof Error ? error.message : "家族情報の保存に失敗しました",
      );
    } finally {
      setFamilySaving(false);
    }
  }

  async function handleDeleteFamily(id: string) {
    if (!window.confirm("この家族プロフィールを削除しますか？")) return;
    try {
      await apiRequest(`/api/family/${id}`, { method: "DELETE" });
      const refreshed = await apiRequest<FamilyMember[]>("/api/family");
      setFamilyMembers(refreshed);
      setSelectedFamilyIds((prev) => prev.filter((memberId) => memberId !== id));
    } catch (error) {
      setFamilyError(
        error instanceof Error ? error.message : "削除に失敗しました",
      );
    }
  }

  function toggleFamilySelection(id: string) {
    setSelectedFamilyIds((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id],
    );
  }

  async function suggestMenus() {
    if (selectedFamilies.length === 0) {
      setMessage("献立を提案する家族を選択してください。");
      return;
    }
    setSuggestionLoading(true);
    setMessage(null);
    try {
      const payload = {
        ingredients,
        sales,
        familyMembers: selectedFamilies.map((member) => ({
          id: member.id,
          name: member.name,
          lifeStage: member.lifeStage,
          appetite: member.appetite,
        })),
      };
      const response = await apiRequest<MenuSuggestion[]>("/api/menu/suggest", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuggestions(response);
      if (response.length === 0) {
        setMessage("提案できる献立がありませんでした。条件を見直してください。");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "献立の生成に失敗しました",
      );
    } finally {
      setSuggestionLoading(false);
    }
  }

  function moveToSelection(menu: MenuSuggestion) {
    sessionStorage.setItem("meal-manager:selectedMenu", JSON.stringify(menu));
    router.push("/menu/selected");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">献立提案 (AI風ロジック)</h2>
            <p className="text-sm text-zinc-500">
              選択した家族の食事量を考慮し、自動で使用量をスケーリングします。
            </p>
          </div>
          <button
            type="button"
            onClick={suggestMenus}
            disabled={suggestionLoading || dataLoading}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {suggestionLoading ? "提案中..." : "献立を提案"}
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className="flex flex-col rounded-2xl border border-zinc-100 p-4 shadow-sm"
              >
                <h3 className="text-base font-semibold">
                  {suggestion.menuTitle}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {suggestion.description}
                </p>
                <p className="mt-2 text-xs text-emerald-700">
                  {suggestion.nutritionComment}
                </p>
                <div className="mt-3 text-sm">
                  <p className="font-semibold text-zinc-700">使用食材</p>
                  <ul className="mt-1 space-y-1 text-zinc-600">
                    {suggestion.usedIngredients.map((item) => (
                      <li key={item.name + item.usedQuantity}>
                        {item.name}: {item.usedQuantity}
                        {item.unit && ` ${item.unit}`}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => moveToSelection(suggestion)}
                  className="mt-auto rounded-full bg-indigo-600 px-4 py-2 text-sm text-white transition hover:bg-indigo-700"
                >
                  この献立を採用
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">献立提案対象を選択</h2>
            <p className="text-sm text-zinc-500">{selectedSummary}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {familyMembers.length === 0 ? (
            <p className="text-sm text-zinc-500">
              まずは家族プロフィールを登録してください。
            </p>
          ) : (
            familyMembers.map((member) => {
              const active = selectedFamilyIds.includes(member.id);
              return (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => toggleFamilySelection(member.id)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 text-zinc-600"
                  }`}
                >
                  {member.name}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">献立提案対象を選択</h2>
            <p className="text-sm text-zinc-500">{selectedSummary}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {familyMembers.length === 0 ? (
            <p className="text-sm text-zinc-500">
              まずは家族プロフィールを登録してください。
            </p>
          ) : (
            familyMembers.map((member) => {
              const active = selectedFamilyIds.includes(member.id);
              return (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => toggleFamilySelection(member.id)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 text-zinc-600"
                  }`}
                >
                  {member.name}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">家族プロフィール</h2>
            <p className="text-sm text-zinc-500">
              世代と食事量を登録して献立提案のベースにします。
            </p>
          </div>
          {familyEditingId && (
            <button
              type="button"
              onClick={resetFamilyForm}
              className="text-sm text-emerald-600 underline"
            >
              新規追加に戻る
            </button>
          )}
        </div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveFamilyMember}>
          <label className="flex flex-col gap-1 text-sm">
            名前 *
            <input
              name="name"
              value={familyForm.name}
              onChange={handleFamilyChange}
              className="rounded-lg border px-3 py-2"
              placeholder="例: はると"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            ライフステージ *
            <select
              name="lifeStage"
              value={familyForm.lifeStage}
              onChange={handleFamilyChange}
              className="rounded-lg border px-3 py-2"
              required
            >
              <option value="">選択してください</option>
              {LIFE_STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            食事量
            <select
              name="appetite"
              value={familyForm.appetite}
              onChange={handleFamilyChange}
              className="rounded-lg border px-3 py-2"
            >
              {APPETITE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            メモ
            <textarea
              name="notes"
              value={familyForm.notes}
              onChange={handleFamilyChange}
              className="min-h-[60px] rounded-lg border px-3 py-2"
              placeholder="アレルギーや好き嫌いなど"
            />
          </label>
          {familyError && (
            <p className="sm:col-span-2 text-sm text-red-600">{familyError}</p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={familySaving}
              className="w-full rounded-full bg-emerald-600 px-4 py-2 text-white disabled:opacity-50 sm:w-auto"
            >
              {familyEditingId ? "家族情報を更新" : "家族を追加"}
            </button>
          </div>
        </form>
        {familyMembers.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {familyMembers.map((member) => (
              <article
                key={member.id}
                className="rounded-2xl border border-zinc-100 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-zinc-500">
                      {member.lifeStage} / {member.appetite}
                    </p>
                    <h3 className="text-base font-semibold">{member.name}</h3>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700"
                      onClick={() => startFamilyEdit(member)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-red-600"
                      onClick={() => handleDeleteFamily(member.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
                {member.notes && (
                  <p className="mt-2 text-sm text-zinc-600">{member.notes}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
