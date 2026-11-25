import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  HeartHandshake,
  Landmark,
  Bell,
  UserRound,
  SlidersHorizontal,
} from "lucide-react";
const everyone = ["admin", "manager", "agent"];

// Ces permissions organisent l'interface. Le backend reste l'autorité réelle.
export const navigation = [
  {
    href: "/",
    label: "Vue d’ensemble",
    icon: LayoutDashboard,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/assures",
    label: "Assurés",
    icon: Users,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/contrats",
    label: "Contrats",
    icon: FileText,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/echeances",
    label: "Échéances",
    icon: Receipt,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/dossiers",
    label: "Dossiers",
    icon: HeartHandshake,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/paiements",
    label: "Paiements",
    icon: Landmark,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/relances",
    label: "Relances",
    icon: Bell,
    roles: everyone,
    group: "workspace",
  },
  {
    href: "/utilisateurs",
    label: "Utilisateurs",
    icon: UserRound,
    roles: ["admin"],
    group: "management",
  },
  {
    href: "/audit",
    label: "Journal d’audit",
    icon: SlidersHorizontal,
    roles: ["admin", "manager"],
    group: "management",
  },
];
export const routeRoles = Object.fromEntries(
  navigation.map(({ href, roles }) => [href, roles]),
);
export const canManage = (user) => ["admin", "manager"].includes(user?.role);
