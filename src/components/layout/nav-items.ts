import {
  ShoppingCart,
  Package,
  Users,
  Wallet,
  CreditCard,
  UserCog,
  Tags,
  Store,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/admin", label: "Kassa", icon: ShoppingCart },
  { href: "/admin/ombor", label: "Ombor", icon: Package },
  { href: "/admin/mijozlar", label: "Mijozlar", icon: Users },
  { href: "/admin/moliya", label: "Moliya", icon: Wallet },
  { href: "/admin/nasiya", label: "Nasiya", icon: CreditCard },
  { href: "/admin/xodimlar", label: "Xodimlar", icon: UserCog },
  { href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: Tags },
  { href: "/admin/sozlamalar", label: "Sozlamalar", icon: Settings },
];

export const storeNavItem: NavItem = { href: "/do-kon", label: "Do'kon", icon: Store };
