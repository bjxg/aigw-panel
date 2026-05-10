import type { TFunction } from "i18next";
import { Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import type { User } from "@/lib/http/apis/users";
import { HoverTooltip } from "@/modules/ui/Tooltip";
import type { VirtualTableColumn } from "@/modules/ui/VirtualTable";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  user: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  disabled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

type CreateUserColumnsOptions = {
  t: TFunction;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

export const createUserColumns = ({
  t,
  onEdit,
  onDelete,
}: CreateUserColumnsOptions): VirtualTableColumn<User>[] => [
  {
    key: "id",
    label: t("users_page.col_id"),
    width: "w-[72px] min-w-[72px]",
    cellClassName: "tabular-nums text-slate-500 dark:text-white/50",
    render: (row) => <>{row.id}</>,
  },
  {
    key: "name",
    label: t("users_page.col_name"),
    width: "w-[140px] min-w-[140px]",
    cellClassName: "font-medium",
    render: (row) => (
      <span className="block min-w-0 truncate">{row.name}</span>
    ),
  },
  {
    key: "username",
    label: t("users_page.col_username"),
    width: "w-[140px] min-w-[140px]",
    cellClassName: "text-slate-700 dark:text-white/70",
    render: (row) => (
      <span className="block min-w-0 truncate">
        {row.username || <span className="text-slate-400 dark:text-white/30">—</span>}
      </span>
    ),
  },
  {
    key: "email",
    label: t("users_page.col_email"),
    width: "w-[200px] min-w-[200px]",
    cellClassName: "text-slate-700 dark:text-white/70",
    render: (row) => (
      <span className="block min-w-0 truncate">
        {row.email || <span className="text-slate-400 dark:text-white/30">—</span>}
      </span>
    ),
  },
  {
    key: "role",
    label: t("users_page.col_role"),
    width: "w-[108px] min-w-[108px]",
    render: (row) => {
      const colorClass = ROLE_COLORS[row.role] ?? ROLE_COLORS.pending;
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}
        >
          {t(`users_page.role_${row.role}`)}
        </span>
      );
    },
  },
  {
    key: "lastSeenAt",
    label: t("users_page.col_last_seen"),
    width: "w-[168px] min-w-[168px]",
    cellClassName: "whitespace-nowrap text-slate-500 dark:text-white/50",
    render: (row) => (
      <>
        {row.last_seen_at
          ? formatUserDate(row.last_seen_at)
          : <span className="text-slate-400 dark:text-white/30">—</span>}
      </>
    ),
  },
  {
    key: "createdAt",
    label: t("users_page.col_created"),
    width: "w-[168px] min-w-[168px]",
    cellClassName: "whitespace-nowrap text-slate-500 dark:text-white/50",
    render: (row) => <>{formatUserDate(row.created_at)}</>,
  },
  {
    key: "actions",
    label: t("users_page.col_actions"),
    width: "w-[100px] min-w-[100px]",
    render: (row) => {
      const editLabel = t("common.edit");
      const deleteLabel = t("common.delete");
      return (
        <div className="flex items-center gap-1.5">
          <HoverTooltip content={editLabel}>
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-amber-600 dark:text-white/50 dark:hover:bg-neutral-800 dark:hover:text-amber-400"
              aria-label={editLabel}
            >
              <Pencil size={15} />
            </button>
          </HoverTooltip>
          <HoverTooltip content={deleteLabel}>
            <button
              type="button"
              onClick={() => onDelete(row)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              aria-label={deleteLabel}
            >
              <Trash2 size={15} />
            </button>
          </HoverTooltip>
        </div>
      );
    },
  },
];

function formatUserDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
