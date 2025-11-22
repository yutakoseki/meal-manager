import type { Sale } from "@/types";
import { listSales } from "@/lib/data-store";

type StorePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ product?: string }>;
};

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = await params;
  const { product } = await searchParams;

  const toSlug = (text: string): string =>
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const deriveSlugs = (sale: Sale): string[] => {
    const slugs: string[] = [];
    if (sale.storeSlug) slugs.push(sale.storeSlug);
    if (sale.storeUrl) {
      try {
        const parsed = new URL(sale.storeUrl);
        const segments = parsed.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          slugs.push(segments[segments.length - 1]);
        }
      } catch {
        // ignore parse errors
      }
    }
    if (sale.storeName) {
      const fromName = toSlug(sale.storeName);
      if (fromName) slugs.push(fromName);
    }
    return Array.from(new Set(slugs));
  };

  const sales = await listSales();
  const targetSlug = slug.toLowerCase();
  const looseMatch = (sale: Sale): boolean => {
    const slugs = deriveSlugs(sale).map((value) => value.toLowerCase());
    if (slugs.includes(targetSlug)) return true;
    const hyphenless = targetSlug.replace(/-/g, "");
    return slugs.some(
      (value) =>
        value === hyphenless ||
        value.replace(/-/g, "") === hyphenless ||
        hyphenless.includes(value.replace(/-/g, "")),
    );
  };

  const storeSales = sales.filter((sale) => looseMatch(sale));

  const storeName = storeSales[0]?.storeName ?? "店舗";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase text-emerald-700">店舗特売</p>
        <h1 className="text-xl font-semibold">{storeName}</h1>
        <p className="text-sm text-zinc-600">
          {storeSales.length > 0
            ? `${storeSales.length} 件の特売情報を掲載しています。`
            : "この店舗の特売情報が見つかりませんでした。"}
        </p>
        {product && (
          <p className="mt-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
            注目商品: {decodeURIComponent(product)}
          </p>
        )}
      </section>

      {storeSales.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-amber-800">
            特売データがまだ登録されていない店舗です。メニューから特売情報を追加してください。
          </p>
        </section>
      ) : (
        <section className="grid gap-3">
          {storeSales.map((sale) => {
            const highlighted =
              product && sale.name.toLowerCase().includes(product.toLowerCase());
            return (
              <article
                key={sale.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  highlighted ? "border-indigo-200 bg-indigo-50" : "border-zinc-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{sale.name}</h2>
                    <p className="text-sm text-zinc-500">
                      {sale.category ?? "カテゴリ未設定"}
                    </p>
                  </div>
                  {(sale.startDate || sale.endDate) && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                      {sale.startDate ?? "未設定"} ~ {sale.endDate ?? "未設定"}
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
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
                      <dt className="text-zinc-500">割引後</dt>
                      <dd className="font-semibold text-emerald-700">
                        {sale.discountedPrice} 円
                      </dd>
                    </div>
                  )}
                  {sale.memo && (
                    <div className="col-span-2">
                      <dt className="text-zinc-500">メモ</dt>
                      <dd>{sale.memo}</dd>
                    </div>
                  )}
                </dl>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
