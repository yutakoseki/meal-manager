"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const links = [
  { href: "/fridge", label: "冷蔵庫" },
  { href: "/sales", label: "特売" },
  { href: "/menu", label: "献立" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            ミールマネージャー
          </p>
          <h1 className="text-xl font-semibold">冷蔵庫 &amp; 献立管理 PoC</h1>
        </div>
        <nav className="flex gap-2">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/fridge" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
