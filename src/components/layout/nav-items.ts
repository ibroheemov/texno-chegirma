import {
  ShoppingCart,
  Package,
  Users,
  Wallet,
  BookOpen,
  UserCog,
  Tags,
  Store,
  Settings,
  PanelsTopLeft,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/admin", label: "Kassa", icon: ShoppingCart },
  { href: "/admin/yangi-dizayn", label: "Yangi dizayn", icon: PanelsTopLeft },
  { href: "/admin/ombor", label: "Ombor", icon: Package },
  { href: "/admin/mijozlar", label: "Mijozlar", icon: Users },
  { href: "/admin/moliya", label: "Moliya", icon: Wallet },
  { href: "/admin/qarz-daftari", label: "Qarz daftari", icon: BookOpen },
  { href: "/admin/xodimlar", label: "Xodimlar", icon: UserCog },
  { href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: Tags },
  { href: "/admin/sozlamalar", label: "Sozlamalar", icon: Settings },
];

export const storeNavItem: NavItem = { href: "/do-kon", label: "Do'kon", icon: Store };
