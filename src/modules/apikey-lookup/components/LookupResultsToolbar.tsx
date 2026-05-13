import type { Dispatch, SetStateAction } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { TimeRangeSelector } from "@/modules/monitor/MonitorPagePieces";
import type { TimeRange } from "@/modules/monitor/monitor-constants";

export function LookupResultsToolbar<T extends string>({
  t,
  activeTab,
  setActiveTab,
  timeRange,
  setTimeRange,
  handleRefresh,
  onGenerateKey,
  loading,
  chartLoading,
  modelsLoading,
  showModelsTab = true,
  showKeysTab = false,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  activeTab: T;
  setActiveTab: React.Dispatch<React.SetStateAction<T>>;
  timeRange: TimeRange;
  setTimeRange: (value: TimeRange) => void;
  handleRefresh: () => void;
  onGenerateKey?: () => void;
  loading: boolean;
  chartLoading: boolean;
  modelsLoading: boolean;
  showModelsTab?: boolean;
  showKeysTab?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="usage">{t("apikey_lookup.usage_stats")}</TabsTrigger>
            <TabsTrigger value="logs">{t("apikey_lookup.request_logs")}</TabsTrigger>
            {showModelsTab ? (
              <TabsTrigger value="models">{t("apikey_lookup.available_models")}</TabsTrigger>
            ) : null}
            {showKeysTab ? (
              <TabsTrigger value="keys">{t("apikey_lookup.my_api_keys")}</TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>
        {activeTab !== "models" && activeTab !== "keys" ? (
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {showKeysTab && activeTab === "keys" && onGenerateKey ? (
          <button
            type="button"
            onClick={onGenerateKey}
            disabled={loading || chartLoading || modelsLoading}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/80 dark:hover:bg-white/10"
          >
            <Plus size={13} />
            {t("apikey_lookup.generate_key")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || chartLoading || modelsLoading}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/80 dark:hover:bg-white/10"
        >
          <RefreshCw
            size={13}
            className={loading || chartLoading || modelsLoading ? "animate-spin" : ""}
          />
          {t("common.refresh")}
        </button>
      </div>
    </div>
  );
}
