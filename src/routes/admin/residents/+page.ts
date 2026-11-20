import { api, type Paginated } from "#lib/api/client.js";
import type { UserRow } from "#lib/api/types.js";
import type { UserRole, UserStatus } from "#lib/labels.js";
import type { PageLoad } from "./$types";

const STATUSES = ["pending", "active", "rejected", "blocked"] as const;
const ROLES = ["resident", "admin", "executor"] as const;

export const load: PageLoad = async ({ fetch, url, depends }) => {
  depends("app:users");

  const tab = url.searchParams.get("tab") === "all" ? "all" : "pending";
  const q = url.searchParams.get("q") ?? "";
  const statusParam = url.searchParams.get("status");
  const roleParam = url.searchParams.get("role");
  const status = STATUSES.find((s) => s === statusParam) as UserStatus | undefined;
  const role = ROLES.find((r) => r === roleParam) as UserRole | undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  // Заявки на подтверждение нужны всегда — для счётчика на вкладке
  const pending = await api.get<Paginated<UserRow>>("/api/users", {
    fetch,
    query: { status: "pending", pageSize: 40, page: tab === "pending" ? page : 1 },
  });

  const all =
    tab === "all"
      ? await api.get<Paginated<UserRow>>("/api/users", {
          fetch,
          query: { q, status, role, page, pageSize: 20 },
        })
      : null;

  return { tab, filters: { q, status: status ?? "", role: role ?? "" }, pending, all } as const;
};
