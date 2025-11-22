import { FridgeManager } from "@/components/fridge-manager";

export default function FridgePage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        冷蔵庫の在庫を登録・編集し、賞味期限の管理と献立提案に備えます。
      </p>
      <FridgeManager />
    </div>
  );
}
