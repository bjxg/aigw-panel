import { ChartSpline, RefreshCw } from "lucide-react";
import { SearchableSelect } from "@/modules/ui/SearchableSelect";
import { TimeRangeSelector } from "@/modules/monitor/MonitorPagePieces";
import type { TimeRange } from "@/modules/monitor/monitor-constants";
import type { APIKeyFilterItem } from "@/lib/http/apis/usage";

export function MonitorToolbarSection({
  t,
  timeRange,
  setTimeRange,
  apiKeyOptions,
  apiFilterInput,
  setApiFilterInput,
  applyFilter,
  refreshData,
  isLoading,
  error,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  timeRange: TimeRange;
  setTimeRange: (value: TimeRange) => void;
  apiKeyOptions: APIKeyFilterItem[];
  apiFilterInput: number;
  setApiFilterInput: (value: number) => void;
  applyFilter: () => void;
  refreshData: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const selectOptions = [
    { value: "0", label: t("monitor.all_keys") },
    ...apiKeyOptions.map((item) => ({
      value: String(item.id),
      label: item.name || `Key #${item.id}`,
      searchText: `${item.name || ""} ${item.id}`,
    })),
  ];

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <ChartSpline size={18} className="text-slate-900 dark:text-white" />
            <span>{t("monitor.title")}</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <SearchableSelect
            value={String(apiFilterInput)}
            onChange={(value) => {
              const numValue = Number(value);
              setApiFilterInput(numValue);
            }}
            options={selectOptions}
            placeholder={t("monitor.all_keys")}
            searchPlaceholder={t("monitor.search_keys")}
            aria-label={t("monitor.filter_key")}
            className="w-full sm:w-auto"
          />
          <button
            type="button"
            onClick={refreshData}
            disabled={isLoading}
            aria-busy={isLoading}
            className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-neutral-950 dark:hover:bg-slate-200"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span className="grid">
              <span
                className={
                  isLoading
                    ? "col-start-1 row-start-1 opacity-0"
                    : "col-start-1 row-start-1 opacity-100"
                }
              >
                {t("monitor.refresh")}
              </span>
              <span
                className={
                  isLoading
                    ? "col-start-1 row-start-1 opacity-100"
                    : "col-start-1 row-start-1 opacity-0"
                }
              >
                {t("monitor.refreshing")}
              </span>
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
