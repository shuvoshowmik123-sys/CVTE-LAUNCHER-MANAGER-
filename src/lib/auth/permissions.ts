import type { UserRole } from "@/lib/validators/schemas";

export const ROLE_ROUTES: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    "/dashboard",
    "/activations/pending",
    "/devices/registry",
    "/devices/approved",
    "/devices/revoked",
    "/anomalies",
    "/admins",
    "/audit",
    "/settings",
  ],
  ADMIN: ["/dashboard", "/activations/pending", "/devices/registry", "/devices/approved", "/devices/revoked", "/anomalies"],
};

export function canManageAdmins(role?: UserRole | null) {
  return role === "SUPER_ADMIN";
}

export function canManageSettings(role?: UserRole | null) {
  return role === "SUPER_ADMIN";
}

export function canApproveRequests(role?: UserRole | null) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAccessRoute(role: UserRole | null | undefined, pathname: string) {
  if (!role) {
    return false;
  }

  const allowedRoutes = ROLE_ROUTES[role] ?? [];
  return allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
