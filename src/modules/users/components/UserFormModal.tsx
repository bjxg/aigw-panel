import { useMemo, useState } from "react";
import type { User } from "@/lib/http/apis/users";
import { Button } from "@/modules/ui/Button";
import { Modal } from "@/modules/ui/Modal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { value: "pending", labelKey: "users_page.role_pending" },
  { value: "user", labelKey: "users_page.role_user" },
  { value: "admin", labelKey: "users_page.role_admin" },
  { value: "disabled", labelKey: "users_page.role_disabled" },
];

export type UserFormValues = {
  name: string;
  username: string;
  email: string;
  role: string;
};

export function makeEmptyUserForm(): UserFormValues {
  return { name: "", username: "", email: "", role: "pending" };
}

export function UserFormModal({
  t,
  open,
  editMode,
  saving,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  open: boolean;
  editMode: boolean;
  saving: boolean;
  form: UserFormValues;
  setForm: React.Dispatch<React.SetStateAction<UserFormValues>>;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [fieldVisited, setFieldVisited] = useState({ email: false });

  const emailError = useMemo(() => {
    if (!form.email.trim() || !fieldVisited.email) return "";
    if (!EMAIL_RE.test(form.email.trim())) {
      return t("users_page.email_invalid");
    }
    return "";
  }, [form.email, fieldVisited.email, t]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editMode ? t("users_page.edit") : t("users_page.create")}
      description={editMode ? t("users_page.edit_desc") : t("users_page.create_desc")}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("users_page.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void onSubmit()} disabled={saving}>
            {editMode
              ? saving
                ? t("users_page.saving")
                : t("users_page.save_btn")
              : saving
                ? t("users_page.creating")
                : t("users_page.create_btn")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("users_page.form_name_label")}
            <span className="text-red-500"> *</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t("users_page.form_name_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          />
        </div>

        {/* Username */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("users_page.form_username_label")}
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            placeholder={t("users_page.form_username_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("users_page.form_email_label")}
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            onBlur={() => setFieldVisited((v) => ({ ...v, email: true }))}
            placeholder={t("users_page.form_email_placeholder")}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/30 ${
              emailError
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50 dark:focus:border-red-400 dark:focus:ring-red-400/20"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-neutral-800 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            }`}
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">{emailError}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("users_page.form_role_label")}
          </label>
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
