import type { UserRole } from "@/types";
import {
  LayoutDashboardIcon,
  PackageIcon,
  TagIcon,
  ShapesIcon,
  BoxesIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  WalletIcon,
  BarChart3Icon,
  LineChartIcon,
  Building2Icon,
  UsersIcon,
  HistoryIcon,
  BellIcon,
  SettingsIcon,
  PrinterIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboardIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "POS",
    href: "/pos",
    icon: ShoppingCartIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Products",
    href: "/products",
    icon: PackageIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Brands",
    href: "/brands",
    icon: TagIcon,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Categories",
    href: "/categories",
    icon: ShapesIcon,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: BoxesIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: ReceiptIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: WalletIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3Icon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: LineChartIcon,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Branches",
    href: "/branches",
    icon: Building2Icon,
    roles: ["super_admin"],
  },
  {
    label: "Managers",
    href: "/managers",
    icon: UsersIcon,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Activity Logs",
    href: "/activity-logs",
    icon: HistoryIcon,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: BellIcon,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Printer Settings",
    href: "/settings/printers",
    icon: PrinterIcon,
    roles: ["super_admin", "admin"],
  },
];
