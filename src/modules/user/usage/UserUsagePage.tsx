import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Key } from "lucide-react";
import { ThemeToggleButton } from "@/modules/ui/ThemeProvider";
import { LanguageSelector } from "@/modules/ui/LanguageSelector";
import type { TimeRange } from "@/modules/monitor/monitor-constants";
import { LogContentModal } from "@/modules/monitor/LogContentModal";
import {
  fetchUserUsageChartData,
  fetchUserUsageLogs,
  fetchUserLogContent,
  fetchUserAPIKeys,
  toggleUserAPIKey,
} from "@/modules/user/usage/user-usage-api";
import type { UserAPIKeyItem } from "@/modules/user/usage/user-usage-api";
import { UserApiKeysSection } from "@/modules/user/usage/UserApiKeysSection";
import { LookupEmptyState } from "@/modules/apikey-lookup/components/LookupEmptyState";
import { LookupResultsToolbar } from "@/modules/apikey-lookup/components/LookupResultsToolbar";
import { LookupSearchSection } from "@/modules/apikey-lookup/components/LookupSearchSection";
import {
  buildLogColumns,
  PublicLogsSection,
} from "@/modules/apikey-lookup/components/PublicLogsSection";
import { UsageTabSection } from "@/modules/apikey-lookup/components/UsageTabSection";
import { useApiKeyLookupCharts } from "@/modules/apikey-lookup/hooks/useApiKeyLookupCharts";
import type { ChartDataResponse, LogRow, PublicLogItem } from "@/modules/apikey-lookup/types";

const DEFAULT_PAGE_SIZE = 50;
const LOOKUP_LAST_API_KEY_STORAGE_KEY = "userUsage.lastApiKey.v1";

const formatLatencyMs = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) return "--";
  if (value < 1) return "<1ms";
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = value / 1000;
  const fixed = seconds.toFixed(seconds < 10 ? 2 : 1);
  const trimmed = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  return `${trimmed}s`;
};

const readStoredLookupKey = (): string => {
  try {
    return window.sessionStorage.getItem(LOOKUP_LAST_API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
};

const writeStoredLookupKey = (value: string): void => {
  try {
    if (value) {
      window.sessionStorage.setItem(LOOKUP_LAST_API_KEY_STORAGE_KEY, value);
    } else {
      window.sessionStorage.removeItem(LOOKUP_LAST_API_KEY_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

function toLogRow(item: PublicLogItem): LogRow {
  return {
    id: String(item.id),
    timestamp: item.timestamp,
    timestampMs: new Date(item.timestamp).getTime(),
    model: item.model,
    failed: item.failed,
    latencyText: formatLatencyMs(item.latency_ms),
    inputTokens: item.input_tokens,
    cachedTokens: item.cached_tokens,
    outputTokens: item.output_tokens,
    totalTokens: item.total_tokens,
    cost: item.cost ?? 0,
    hasContent: item.has_content,
  };
}

export function UserUsagePage() {
  const { t } = useTranslation();
  const isDark = false;

  const [compact, setCompact] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 699px)");
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    setCompact(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const initialLookupKey = useMemo(() => readStoredLookupKey(), []);
  const [apiKeyInput, setApiKeyInput] = useState(initialLookupKey);
  const [queriedKey, setQueriedKey] = useState(initialLookupKey);

  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentModalLogId, setContentModalLogId] = useState<number | null>(null);
  const [contentModalTab, setContentModalTab] = useState<"input" | "output">("input");

  const handleContentClick = useCallback((logId: number, tab: "input" | "output") => {
    setContentModalLogId(logId);
    setContentModalTab(tab);
    setContentModalOpen(true);
  }, []);

  const logColumns = useMemo(() => buildLogColumns(t, handleContentClick), [t, handleContentClick]);
  const statusOptions = useMemo(
    () => [
      { value: "", label: t("apikey_lookup.all_status"), searchText: "all status" },
      { value: "success", label: t("request_logs.status_success"), searchText: "success" },
      { value: "failed", label: t("request_logs.status_failed"), searchText: "failed" },
    ],
    [t],
  );

  const [activeTab, setActiveTab] = useState<"usage" | "logs" | "models" | "keys">("usage");

  const [apiKeys, setApiKeys] = useState<UserAPIKeyItem[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [togglingKeyId, setTogglingKeyId] = useState<number | null>(null);

  const [rawItems, setRawItems] = useState<PublicLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCacheRef = useRef<Record<string, ChartDataResponse>>({});

  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [modelQuery, setModelQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [stats, setStats] = useState<{
    total: number;
    success_rate: number;
    total_tokens: number;
    total_cost: number;
  }>({ total: 0, success_rate: 0, total_tokens: 0, total_cost: 0 });
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);
  const paginationInFlightRef = useRef(false);
  const initialFetchedRef = useRef(false);

  const fetchLogs = useCallback(
    async (key: string, page: number, size?: number) => {
      if (paginationInFlightRef.current) return;
      paginationInFlightRef.current = true;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const myFetchId = ++fetchIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const resp = await fetchUserUsageLogs({
          apiKey: key.trim() || undefined,
          page,
          size: size ?? pageSize,
          days: timeRange,
          model: modelQuery || undefined,
          status: statusFilter || undefined,
          signal: controller.signal,
        });

        if (myFetchId !== fetchIdRef.current) return;

        setRawItems(resp.items ?? []);
        setTotalCount(resp.total ?? 0);
        setCurrentPage(page);
        setStats(resp.stats ?? { total: 0, success_rate: 0, total_tokens: 0, total_cost: 0 });
        setModelOptions(resp.filters?.models ?? []);
        setLastUpdatedAt(Date.now());
        setQueriedKey(key.trim());
        writeStoredLookupKey(key.trim());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (myFetchId !== fetchIdRef.current) return;

        const message = err instanceof Error ? err.message : t("apikey_lookup.query_failed");
        setError(message);
        setRawItems([]);
        setTotalCount(0);
        setStats({ total: 0, success_rate: 0, total_tokens: 0, total_cost: 0 });
      } finally {
        paginationInFlightRef.current = false;
        if (myFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [t, timeRange, modelQuery, statusFilter, pageSize],
  );

  const fetchChartDataFn = useCallback(async (key: string, days: number) => {
    const cacheKey = `${key}|${days}`;
    if (chartCacheRef.current[cacheKey]) {
      setChartData(chartCacheRef.current[cacheKey]);
      return;
    }
    setChartLoading(true);
    try {
      const data = await fetchUserUsageChartData({ apiKey: key.trim() || undefined, days });
      chartCacheRef.current[cacheKey] = data;
      setChartData(data);
    } catch {
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, []);

  const rows = useMemo<LogRow[]>(() => rawItems.map((item) => toLogRow(item)), [rawItems]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      fetchLogs(queriedKey, clamped);
    },
    [fetchLogs, queriedKey, totalPages],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      fetchLogs(queriedKey, 1, newSize);
    },
    [fetchLogs, queriedKey],
  );

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs(queriedKey, 1);
    }
  }, [timeRange, modelQuery, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialFetchedRef.current) return;
    initialFetchedRef.current = true;
    chartCacheRef.current = {};
    void fetchChartDataFn(queriedKey, timeRange);
    fetchLogs(queriedKey, 1);
  }, [fetchChartDataFn, fetchLogs, queriedKey, timeRange]);

  useEffect(() => {
    if (!initialFetchedRef.current) return;
    chartCacheRef.current = {};
    if (activeTab === "usage") {
      void fetchChartDataFn(queriedKey, timeRange);
    }
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialFetchedRef.current) return;
    if (activeTab === "usage") {
      void fetchChartDataFn(queriedKey, timeRange);
    } else if (activeTab === "logs") {
      fetchLogs(queriedKey, 1);
    } else if (activeTab === "keys") {
      void fetchAPIKeys();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAPIKeys = useCallback(async () => {
    setApiKeysLoading(true);
    try {
      const data = await fetchUserAPIKeys();
      setApiKeys(data.items ?? []);
    } catch {
      setApiKeys([]);
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  const handleToggleKey = useCallback(async (id: number, disabled: boolean) => {
    setTogglingKeyId(id);
    try {
      await toggleUserAPIKey({ id, disabled });
      setApiKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, disabled } : k)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失败";
      setError(message);
    } finally {
      setTogglingKeyId(null);
    }
  }, []);

  const handleSubmit = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      const val = apiKeyInput.trim();
      setModelQuery("");
      setStatusFilter("");
      setRawItems([]);
      setCurrentPage(1);
      chartCacheRef.current = {};
      if (activeTab === "usage") {
        void fetchChartDataFn(val, timeRange);
        fetchLogs(val, 1);
      } else if (activeTab === "keys") {
        void fetchAPIKeys();
      } else {
        fetchLogs(val, 1);
        void fetchChartDataFn(val, timeRange);
      }
      writeStoredLookupKey(val);
    },
    [apiKeyInput, activeTab, timeRange, fetchLogs, fetchChartDataFn, fetchAPIKeys],
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === "usage") {
      chartCacheRef.current = {};
      void fetchChartDataFn(queriedKey, timeRange);
    } else if (activeTab === "keys") {
      void fetchAPIKeys();
    } else {
      fetchLogs(queriedKey, 1);
    }
  }, [queriedKey, activeTab, timeRange, fetchLogs, fetchChartDataFn, fetchAPIKeys]);

  const {
    chartStats,
    modelMetric,
    setModelMetric,
    dailyLegendSelected,
    dailySeries,
    dailyTrendOption,
    toggleDailyLegend,
    dailyLegendAvailability,
    modelDistributionData,
    modelDistributionOption,
    modelDistributionLegend,
  } = useApiKeyLookupCharts({
    chartData,
    compact,
    isDark,
    t,
  });

  const modelFilterOptions = useMemo(
    () => [
      { value: "", label: t("apikey_lookup.all_models"), searchText: "all models" },
      ...modelOptions.map((m) => ({ value: m, label: m, searchText: m })),
    ],
    [modelOptions, t],
  );

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdatedAt) return "";
    const d = new Date(lastUpdatedAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, [lastUpdatedAt]);

  return (
    <div className="relative min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Key size={16} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              {t("apikey_lookup.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector className="inline-flex items-center rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10" />
            <ThemeToggleButton className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl space-y-5 px-4 py-6 sm:px-6">
        <LookupSearchSection
          t={t}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          handleSubmit={handleSubmit}
          loading={loading}
          allowEmptySearch={true}
        />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!error && (
          <>
            <LookupResultsToolbar
              t={t}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              handleRefresh={handleRefresh}
              loading={loading}
              chartLoading={chartLoading}
              modelsLoading={false}
              showModelsTab={false}
              showKeysTab={true}
            />

            {initialFetchedRef.current && activeTab === "usage" ? (
              <UsageTabSection
                t={t}
                timeRange={timeRange}
                chartStats={chartStats}
                chartLoading={chartLoading}
                modelMetric={modelMetric}
                setModelMetric={setModelMetric}
                modelDistributionData={modelDistributionData}
                modelDistributionOption={modelDistributionOption as Record<string, unknown>}
                modelDistributionLegend={modelDistributionLegend}
                dailySeries={dailySeries}
                dailyTrendOption={dailyTrendOption as Record<string, unknown>}
                dailyLegendAvailability={dailyLegendAvailability}
                dailyLegendSelected={dailyLegendSelected}
                toggleDailyLegend={toggleDailyLegend}
              />
            ) : null}

            {initialFetchedRef.current && activeTab === "logs" ? (
              <PublicLogsSection
                t={t}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                statusOptions={statusOptions}
                modelOptions={modelOptions}
                modelQuery={modelQuery}
                setModelQuery={setModelQuery}
                modelFilterOptions={modelFilterOptions}
                stats={stats}
                lastUpdatedText={lastUpdatedText}
                loading={loading}
                logColumns={logColumns}
                rows={rows}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            ) : null}

            {activeTab === "keys" ? (
              <UserApiKeysSection
                items={apiKeys}
                loading={apiKeysLoading}
                onToggle={handleToggleKey}
                togglingId={togglingKeyId}
              />
            ) : null}
          </>
        )}

        <LogContentModal
          open={contentModalOpen}
          logId={contentModalLogId}
          initialTab={contentModalTab}
          onClose={() => setContentModalOpen(false)}
          fetchPartFn={async (
            id: number,
            part: "input" | "output",
            options?: { signal?: AbortSignal },
          ) => {
            const data = await fetchUserLogContent({
              id,
              apiKey: queriedKey || undefined,
              part,
              format: "json",
              signal: options?.signal,
            });
            return data as {
              id: number;
              model: string;
              part: "input" | "output";
              content: string;
            };
          }}
        />
      </main>
    </div>
  );
}
