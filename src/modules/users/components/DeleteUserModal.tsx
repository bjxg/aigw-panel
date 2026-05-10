import type { User } from "@/lib/http/apis/users";
import { Button } from "@/modules/ui/Button";
import { Modal } from "@/modules/ui/Modal";

type DeleteUserModalProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  user: User | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteUserModal({
  t,
  user,
  open,
  saving,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("users_page.confirm_delete")}
      description={t("users_page.delete_warning")}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("users_page.cancel")}
          </Button>
          <Button variant="danger" onClick={() => void onConfirm()} disabled={saving}>
            {saving ? t("users_page.deleting") : t("users_page.confirm_delete_btn")}
          </Button>
        </>
      }
    >
      {user ? (
        <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <div className="text-sm font-medium text-red-800 dark:text-red-300">
            {user.name}
          </div>
          {user.email && (
            <div className="text-xs text-red-600 dark:text-red-400">{user.email}</div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
