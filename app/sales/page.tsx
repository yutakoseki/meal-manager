import { SalesManager } from "@/components/sales-manager";

export default function SalesPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        スーパー特売情報を登録して、献立提案時にコスト感や旬を反映させます。
      </p>
      <SalesManager />
    </div>
  );
}
