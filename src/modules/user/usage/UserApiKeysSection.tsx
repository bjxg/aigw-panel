import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Key, Eye, EyeOff, Copy, Check, Server, Bot, Loader2 } from "lucide-react";
import type { UserAPIKeyItem } from "./user-usage-api";

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = fallbackCopy(text);
      }
    } catch {
      ok = fallbackCopy(text);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
      title={copied ? "已复制" : "复制"}
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

function maskKey(key: string): string {
  if (key.length <= 10) return key;
  return key.slice(0, 5) + "..." + key.slice(-5);
}

function ApiKeyCard({
  item,
  onToggle,
  toggling,
}: {
  item: UserAPIKeyItem;
  onToggle: (id: number, disabled: boolean) => void;
  toggling: boolean;
}) {
  const { t } = useTranslation();
  const [showKey, setShowKey] = useState(false);

  const displayKey = showKey ? item.key : maskKey(item.key);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 dark:bg-white/10">
            <Key size={18} className="text-white dark:text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {item.name || t("apikey_lookup.unnamed_key")}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 dark:bg-white/10 dark:text-white/80">
                {displayKey}
              </code>
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white/70"
                title={showKey ? "隐藏" : "显示"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <CopyButton text={item.key} />
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggle(item.id, !item.disabled)}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            item.disabled
              ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
          } ${toggling ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          title={item.disabled ? t("apikey_lookup.enable") : t("apikey_lookup.disable")}
        >
          {toggling && <Loader2 size={12} className="animate-spin" />}
          {item.disabled ? t("apikey_lookup.disabled") : t("apikey_lookup.active")}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <div className="text-xs text-slate-500 dark:text-white/50">{t("apikey_lookup.daily_limit")}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white/90">
            {item.daily_limit > 0 ? item.daily_limit.toLocaleString() : t("apikey_lookup.unlimited")}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <div className="text-xs text-slate-500 dark:text-white/50">{t("apikey_lookup.total_quota")}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white/90">
            {item.total_quota > 0 ? item.total_quota.toLocaleString() : t("apikey_lookup.unlimited")}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <div className="text-xs text-slate-500 dark:text-white/50">{t("apikey_lookup.rpm_limit")}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white/90">
            {item.rpm_limit > 0 ? item.rpm_limit.toLocaleString() : t("apikey_lookup.unlimited")}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <div className="text-xs text-slate-500 dark:text-white/50">{t("apikey_lookup.tpm_limit")}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white/90">
            {item.tpm_limit > 0 ? item.tpm_limit.toLocaleString() : t("apikey_lookup.unlimited")}
          </div>
        </div>
      </div>

      {item.channel_groups.length > 0 && (
        <div className="mt-4 space-y-3">
          {item.channel_groups.map((group, idx) => (
            <div
              key={group.name || `default-${idx}`}
              className="rounded-xl border border-slate-100 p-3 dark:border-white/5"
            >
              {group.name && (
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  {group.name}
                </div>
              )}

              {group.paths.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                    <Server size={12} />
                    <span>{t("apikey_lookup.api_endpoints")}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {group.paths.map((path) => (
                      <code
                        key={path}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700 dark:bg-white/10 dark:text-white/80"
                      >
                        {path}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {group.models.length > 0 ? (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                    <Bot size={12} />
                    <span>{t("apikey_lookup.allowed_models")}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {group.models.map((model) => (
                      <span
                        key={model}
                        className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-white/80"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                    <Bot size={12} />
                    <span>{t("apikey_lookup.allowed_models")}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-white/80">
                      {t("apikey_lookup.all_models")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserApiKeysSection({
  items,
  loading,
  onToggle,
  togglingId,
}: {
  items: UserAPIKeyItem[];
  loading: boolean;
  onToggle?: (id: number, disabled: boolean) => void;
  togglingId?: number | null;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex animate-pulse gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:border-neutral-700 dark:bg-neutral-900">
        <Key size={40} className="text-slate-300 dark:text-white/20" />
        <p className="mt-3 text-sm text-slate-500 dark:text-white/50">
          {t("apikey_lookup.no_api_keys")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ApiKeyCard
          key={item.id}
          item={item}
          onToggle={onToggle ?? (() => {})}
          toggling={togglingId === item.id}
        />
      ))}
    </div>
  );
}
