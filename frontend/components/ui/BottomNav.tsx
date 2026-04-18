"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Sparkles, Map, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",          icon: Home,           label: "Home"    },
  { href: "/feed",      icon: Search,         label: "Browse"  },
  { href: "/recommend", icon: Sparkles,       label: "Ask Bud" },
  { href: "/map",       icon: Map,            label: "Map"     },
  { href: "/list",      icon: ShoppingBasket, label: "List"    },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card/90 backdrop-blur-lg border-t border-surface-border max-w-xl mx-auto">
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                active ? "text-brand" : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-safe-area-bottom" />
    </nav>
  );
}
