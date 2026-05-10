import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Search, Users as UsersIcon } from "lucide-react";
import { usersApi, type User } from "@/lib/http/apis/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import { createUserColumns } from "@/modules/users/components/UserColumns";
import {
  UserFormModal,
  makeEmptyUserForm,
  type UserFormValues,
} from "@/modules/users/components/UserFormModal";
import { DeleteUserModal } from "@/modules/users/components/DeleteUserModal";
import { Card } from "@/modules/ui/Card";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { useToast } from "@/modules/ui/ToastProvider";
import { VirtualTable } from "@/modules/ui/VirtualTable";

const ROLE_FILTER_OPTIONS = [
  { value: "", labelKey: "users_page.role_all" },
  { value: "admin", labelKey: "users_page.role_admin" },
  { value: "user", labelKey: "users_page.role_user" },
  { value: "pending", labelKey: "users_page.role_pending" },
  { value: "disabled", labelKey: "users_page.role_disabled" },
];

export function UsersPage() {
  const { t } = useTranslation();
  const { notify } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserFormValues>(() => makeEmptyUserForm());

  /* ─── load ─── */

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("users_page.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, notify, t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /* ─── create ─── */

  const handleOpenCreate = () => {
    setForm(makeEmptyUserForm());
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      notify({ type: "error", message: t("users_page.name_required") });
      return;
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      notify({ type: "error", message: t("users_page.email_invalid") });
      return;
    }
    setSaving(true);
    try {
      await usersApi.create({
        name: form.name.trim(),
        username: form.username.trim() || null,
        email: form.email.trim() || null,
        role: form.role,
      });
      notify({ type: "success", message: t("users_page.created_success") });
      setShowCreate(false);
      await loadUsers();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("users_page.create_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── edit ─── */

  const handleOpenEdit = (user: User) => {
    setForm({
      name: user.name,
      username: user.username || "",
      email: user.email || "",
      role: user.role,
    });
    setEditUser(user);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!form.name.trim()) {
      notify({ type: "error", message: t("users_page.name_required") });
      return;
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      notify({ type: "error", message: t("users_page.email_invalid") });
      return;
    }
    setSaving(true);
    try {
      const updates: Partial<User> = {
        name: form.name.trim(),
        username: (form.username.trim() || null) as unknown as undefined,
        email: (form.email.trim() || null) as unknown as undefined,
        role: form.role,
      };
      await usersApi.update(editUser.id, updates);
      notify({ type: "success", message: t("users_page.updated_success") });
      setEditUser(null);
      await loadUsers();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("users_page.update_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── delete ─── */

  const handleDelete = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await usersApi.delete(deleteUser.id);
      notify({ type: "success", message: t("users_page.deleted_success") });
      setDeleteUser(null);
      await loadUsers();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("users_page.delete_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── columns ─── */

  const userColumns = useMemo(
    () =>
      createUserColumns({
        t,
        onEdit: handleOpenEdit,
        onDelete: (user: User) => setDeleteUser(user),
      }),
    [t],
  );

  /* ─── search debounce ─── */

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ─── render ─── */

  return (
    <div className="space-y-6">
      <Card
        title={t("users_page.title")}
        description={t("users_page.description")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadUsers()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {t("users_page.refresh")}
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus size={14} />
              {t("users_page.create_user")}
            </Button>
          </div>
        }
        loading={loading}
      >
        {/* Search & Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("users_page.search_placeholder")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {users.length === 0 && !loading ? (
          <EmptyState
            title={t("users_page.no_users")}
            description={t("users_page.no_users_desc")}
            icon={<UsersIcon size={32} className="text-slate-400" />}
          />
        ) : (
          <VirtualTable<User>
            rows={users}
            columns={userColumns}
            rowKey={(row) => String(row.id)}
            rowHeight={44}
            height="h-[calc(100dvh-360px)] max-h-[60vh]"
            minHeight="min-h-[320px]"
            minWidth="min-w-[928px]"
            caption={t("users_page.table_caption")}
            emptyText={t("users_page.no_users")}
          />
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-white/60">
            <div className="flex items-center gap-2">
              <span>{t("users_page.page_size_label")}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              >
                {[10, 20, 50].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("users_page.prev")}
              </Button>
              <span className="tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("users_page.next")}
              </Button>
              <span className="ml-2 text-xs text-slate-400 dark:text-white/40">
                {t("users_page.total_count", { count: total })}
              </span>
            </div>
          </div>
        )}
      </Card>

      <UserFormModal
        t={t}
        open={showCreate}
        editMode={false}
        saving={saving}
        form={form}
        setForm={setForm}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />

      <UserFormModal
        t={t}
        open={editUser !== null}
        editMode
        saving={saving}
        form={form}
        setForm={setForm}
        onClose={() => setEditUser(null)}
        onSubmit={handleEdit}
      />

      <DeleteUserModal
        t={t}
        user={deleteUser}
        open={deleteUser !== null}
        saving={saving}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
