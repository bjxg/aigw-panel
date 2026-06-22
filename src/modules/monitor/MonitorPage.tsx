import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usageApi } from "@/lib/http/apis";
import type { APIKeyFilterItem } from "@/lib/http/apis/usage";
import { apiKeyEntriesApi } from "@/lib/http/apis/api-keys";
import { useTheme } from "@/modules/ui/ThemeProvider";
import { CHART_COLOR_CLASSES, HOURLY_MODEL_COLORS } from "@/modules/monitor/monitor-constants";
import {
  formatCompact,
  formatHourLabel,
  formatMonthDay,
  formatMonthDayHourLabel,
  parseHourBucketDate,
  parseHourBucketLabel,
} from "@/modules/monitor/monitor-format";
import {
  createDailyTrendOption,
  createHourlyModelOption,
  createHourlyTokenOption,
  createModelDistributionOption,
} from "@/modules/monitor/monitor-chart-options";
import {
  MonitorDistributionSections,
  MonitorHourlySections,
  MonitorKpiSection,
} from "@/modules/monitor/MonitorDashboardSections";
import { useMonitorDashboardState } from "@/modules/monitor/hooks/useMonitorDashboardState";
import { MonitorToolbarSection } from "@/modules/monitor/MonitorToolbarSection";
import { useTranslation } from "react-i18next";

const DAILY_LEGEND_KEYS = {
  input: "daily_input",
  output: "daily_output",
  requests: "daily_requests",
} as const;
const HOURLY_MODEL_OTHER_KEY = "__other__";
const HOURLY_MODEL_TOTAL_KEY = "__total_requests__";
const HOURLY_TOKEN_KEYS = {
  input: "hourly_input",
  output: "hourly_output",
  reasoning: "hourly_reasoning",
  cached: "hourly_cached",
  total: "__total_token__",
} as const;

export function MonitorPage() {
  const { t } = useTranslation();
  const {
    state: { mode },
  } = useTheme();
  const isDark = mode === "dark";

  const {
    compact,
    timeRange,
    setTimeRange,
    apiFilterInput,
    setApiFilterInput,
    apiFilter,
    setApiFilter,
    applyFilter,
    modelHourWindow,
    setModelHourWindow,
    tokenHourWindow,
    setTokenHourWindow,
    modelMetric,
    setModelMetric,
    apikeyMetric,
    setApikeyMetric,
  } = useMonitorDashboardState();

  const [dailyLegendSelected, setDailyLegendSelected] = useState<Record<string, boolean>>({
    [DAILY_LEGEND_KEYS.input]: true,
    [DAILY_LEGEND_KEYS.output]: true,
    [DAILY_LEGEND_KEYS.requests]: true,
  });

  const [hourlyModelSelected, setHourlyModelSelected] = useState<Record<string, boolean>>({
    [HOURLY_MODEL_TOTAL_KEY]: true,
  });

  const [hourlyTokenSelected, setHourlyTokenSelected] = useState<Record<string, boolean>>({
    [HOURLY_TOKEN_KEYS.input]: true,
    [HOURLY_TOKEN_KEYS.output]: true,
    [HOURLY_TOKEN_KEYS.reasoning]: true,
    [HOURLY_TOKEN_KEYS.cached]: true,
    [HOURLY_TOKEN_KEYS.total]: true,
  });

  const [chartData, setChartData] = useState<import("@/lib/http/types").ChartDataResponse | null>(
    null,
  );
  const [modelDistributionSelected, setModelDistributionSelected] = useState<
    Record<string, boolean>
  >({});
  const [apikeyDistributionSelected, setApikeyDistributionSelected] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isPending] = useTransition();
  const requestIdRef = useRef(0);
  const [apiKeyOptions, setApiKeyOptions] = useState<APIKeyFilterItem[]>([]);

  const refreshData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setIsRefreshing(true);
    setError(null);
    try {
      // Always request an hourly window at least as wide as the largest
      // "最近 N 小时" tab the user can pick, so that switching tabs between 6 /
      // 12 / 24 reflects different bucket counts in the chart.
      const hourWindow = Math.max(modelHourWindow, tokenHourWindow, 24);
      const chartResp = await usageApi.getChartData(
        timeRange,
        apiFilter || undefined,
        { hourWindow },
      );
      if (requestIdRef.current !== currentRequestId) return;
      setChartData(chartResp);
    } catch (requestError) {
      if (requestIdRef.current !== currentRequestId) return;
      const message =
        requestError instanceof Error ? requestError.message : t("monitor.failed_fetch");
      setError(message);
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsRefreshing(false);
      }
    }
  }, [t, timeRange, apiFilter, modelHourWindow, tokenHourWindow]);

  const metrics = useMemo(() => {
    let requests = 0;
    let failed = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    if (chartData?.daily_series) {
      for (const pt of chartData.daily_series) {
        requests += pt.requests || 0;
        failed += pt.failed_requests || 0;
        inputTokens += pt.input_tokens || 0;
        outputTokens += pt.output_tokens || 0;
      }
    }

    const success = requests - failed;
    const rate = requests > 0 ? (success / requests) * 100 : 0;

    return {
      totalRequests: requests,
      successCount: success,
      failureCount: failed,
      successRate: rate,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }, [chartData]);

  const toggleDailyLegend = useCallback((key: string) => {
    if (
      !Object.values(DAILY_LEGEND_KEYS).includes(
        key as (typeof DAILY_LEGEND_KEYS)[keyof typeof DAILY_LEGEND_KEYS],
      )
    ) {
      return;
    }
    setDailyLegendSelected((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  const toggleHourlyModelLegend = useCallback((key: string) => {
    setHourlyModelSelected((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  const toggleHourlyTokenLegend = useCallback((key: string) => {
    setHourlyTokenSelected((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  const hasData = metrics.totalRequests > 0;
  const isLoading = isRefreshing || isPending;

  // Fetch API key options for the filter dropdown
  useEffect(() => {
    void (async () => {
      try {
        const entries = await apiKeyEntriesApi.list();
        setApiKeyOptions(
          entries
            .filter((e) => e.id !== undefined && e.id > 0)
            .map((e) => ({ id: e.id!, name: e.name || "" })),
        );
      } catch {
        // silent - filter will just show "All"
      }
    })();
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const modelTotals = useMemo(() => {
    if (!chartData?.model_distribution) return [];
    return chartData.model_distribution.sort(
      (left, right) => right.requests - left.requests || left.model.localeCompare(right.model),
    );
  }, [chartData]);

  const sortedModelsByMetric = useMemo(() => {
    const list = [...modelTotals];
    list.sort((left, right) => {
      const leftValue = modelMetric === "requests" ? left.requests : left.tokens;
      const rightValue = modelMetric === "requests" ? right.requests : right.tokens;
      return rightValue - leftValue || left.model.localeCompare(right.model);
    });
    return list;
  }, [modelMetric, modelTotals]);

  const topModelKeys = useMemo(
    () => sortedModelsByMetric.slice(0, 5).map((item) => item.model),
    [sortedModelsByMetric],
  );

  const modelDistributionData = useMemo(() => {
    const top = sortedModelsByMetric.slice(0, 10);
    const otherValue = sortedModelsByMetric.slice(10).reduce((acc, item) => {
      return acc + (modelMetric === "requests" ? item.requests : item.tokens);
    }, 0);

    const data = top.map((item) => ({
      name: item.model,
      value: modelMetric === "requests" ? item.requests : item.tokens,
    }));

    if (otherValue > 0) {
      data.push({ name: t("common.other"), value: otherValue });
    }
    return data;
  }, [modelMetric, sortedModelsByMetric, t]);

  useEffect(() => {
    setModelDistributionSelected((prev) => {
      const next = { ...prev };
      for (const item of modelDistributionData) {
        if (!(item.name in next)) next[item.name] = true;
      }
      return next;
    });
  }, [modelDistributionData]);

  const visibleModelDistributionData = useMemo(
    () => modelDistributionData.filter((item) => modelDistributionSelected[item.name] ?? true),
    [modelDistributionData, modelDistributionSelected],
  );

  const dailySeries = useMemo(() => {
    if (!chartData?.daily_series) return [];

    // Parse backend date strings ("YYYY-MM-DD") to Date objects and format label
    // Using UTC parsing trick to match backend day strings consistently
    return chartData.daily_series.map((pt) => {
      // Create a date assuming noon UTC so boundary issues don't push it across
      // local day boundaries.
      const match = pt.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let label = pt.date;
      if (match) {
        // Create local Date from the year, month, day
        const localD = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        label = formatMonthDay(localD);
      }
      return {
        label,
        requests: pt.requests,
        inputTokens: pt.input_tokens,
        outputTokens: pt.output_tokens,
        totalTokens: pt.input_tokens + pt.output_tokens,
      };
    });
  }, [chartData]);

  const hourlySeries = useMemo(() => {
    const modelKeys = [...topModelKeys, HOURLY_MODEL_OTHER_KEY];

    // ---- 1. Build a Map<hourKey, ...> from the backend, where hourKey is
    //         the UTC timestamp of the truncated hour (so different
    //         representations of the same hour all collide on one bucket).
    type ModelBucket = { label: string; stacksMap: Map<string, number> };
    type TokenBucket = {
      input: number;
      output: number;
      reasoning: number;
      cached: number;
      total: number;
    };
    const modelBucketsByHour = new Map<number, ModelBucket>();
    const tokenBucketsByHour = new Map<number, TokenBucket>();

    const hourKey = (date: Date) => {
      // Truncate to local-time hour, then take the wall-clock UTC ms of
      // that instant. This makes the map key stable across formatting.
      const truncated = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        0,
        0,
        0,
      );
      return truncated.getTime();
    };

    for (const pt of chartData?.hourly_models || []) {
      const date = parseHourBucketDate(pt.hour);
      if (!date) continue;
      const key = hourKey(date);
      let bucket = modelBucketsByHour.get(key);
      if (!bucket) {
        bucket = { label: formatHourLabel(date), stacksMap: new Map<string, number>() };
        modelBucketsByHour.set(key, bucket);
      }
      const current = bucket.stacksMap.get(pt.model) || 0;
      bucket.stacksMap.set(pt.model, current + pt.requests);
    }

    for (const pt of chartData?.hourly_tokens || []) {
      const date = parseHourBucketDate(pt.hour);
      if (!date) continue;
      const key = hourKey(date);
      const existing = tokenBucketsByHour.get(key);
      tokenBucketsByHour.set(key, {
        input: (existing?.input ?? 0) + pt.input_tokens,
        output: (existing?.output ?? 0) + pt.output_tokens,
        reasoning: (existing?.reasoning ?? 0) + pt.reasoning_tokens,
        cached: (existing?.cached ?? 0) + pt.cached_tokens,
        total: (existing?.total ?? 0) + pt.total_tokens,
      });
    }

    // ---- 2. Decide how many hours to render. Use the largest tab window
    //         the user could pick, so 6/12/24 always have data to slice from.
    const windowHours = Math.max(modelHourWindow, tokenHourWindow, 24);

    // ---- 3. Anchor the window to "now" (truncated to the current hour),
    //         NOT to the latest data hour, so the x axis always represents
    //         the actual last N hours up to the present moment. A request
    //         made at 09:13 should see the right-most column labelled 09:00,
    //         not 19:00 of the previous day just because the system has
    //         been idle since then.
    const HOUR_MS = 60 * 60 * 1000;
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const anchorMs = now.getTime();
    const hours: { ms: number; date: Date }[] = [];
    for (let i = windowHours - 1; i >= 0; i -= 1) {
      const ms = anchorMs - i * HOUR_MS;
      hours.push({ ms, date: new Date(ms) });
    }

    // Use month-day prefix whenever the window spans more than one day, so
    // e.g. 23:00 → 02:00 doesn't visually overlap on the x axis.
    const spanDays = (() => {
      if (hours.length === 0) return 0;
      const first = new Date(hours[0].ms);
      const last = new Date(hours[hours.length - 1].ms);
      const same =
        first.getFullYear() === last.getFullYear() &&
        first.getMonth() === last.getMonth() &&
        first.getDate() === last.getDate();
      return same ? 1 : 2;
    })();
    const labelFor = (date: Date) =>
      spanDays > 1 ? formatMonthDayHourLabel(date) : formatHourLabel(date);

    // ---- 4. Materialize the chart buckets in chronological order.
    const modelPoints = hours.map(({ ms, date }) => {
      const bucket = modelBucketsByHour.get(ms);
      if (bucket) {
        bucket.label = labelFor(date);
        const stacks = modelKeys.map((key) => {
          if (key === HOURLY_MODEL_OTHER_KEY) {
            let sum = 0;
            for (const [m, v] of bucket.stacksMap.entries()) {
              if (!topModelKeys.includes(m)) sum += v;
            }
            return { key, value: sum };
          }
          return { key, value: bucket.stacksMap.get(key) || 0 };
        });
        return { label: bucket.label, stacks };
      }
      return {
        label: labelFor(date),
        stacks: modelKeys.map((key) => ({ key, value: 0 })),
      };
    });

    const tokenKeys = [
      HOURLY_TOKEN_KEYS.input,
      HOURLY_TOKEN_KEYS.output,
      HOURLY_TOKEN_KEYS.reasoning,
      HOURLY_TOKEN_KEYS.cached,
      HOURLY_TOKEN_KEYS.total,
    ];
    const tokenPoints = hours.map(({ ms, date }) => {
      const bucket = tokenBucketsByHour.get(ms);
      const zero = {
        input: 0,
        output: 0,
        reasoning: 0,
        cached: 0,
        total: 0,
      };
      const t = bucket ?? zero;
      return {
        label: labelFor(date),
        stacks: [
          { key: HOURLY_TOKEN_KEYS.input, value: t.input },
          { key: HOURLY_TOKEN_KEYS.output, value: t.output },
          { key: HOURLY_TOKEN_KEYS.reasoning, value: t.reasoning },
          { key: HOURLY_TOKEN_KEYS.cached, value: t.cached },
          { key: HOURLY_TOKEN_KEYS.total, value: t.total },
        ],
      };
    });

    return {
      modelKeys,
      modelPoints,
      tokenKeys,
      tokenPoints,
    };
  }, [chartData, topModelKeys, modelHourWindow, tokenHourWindow]);

  const hourlyModelPalette = useMemo(() => {
    const palette = [
      "bg-emerald-400",
      "bg-violet-400",
      "bg-amber-400",
      "bg-pink-300",
      "bg-teal-400",
    ];
    const colorByKey: Record<string, string> = {};
    const classByKey: Record<string, string> = {};

    hourlySeries.modelKeys.forEach((key, index) => {
      if (key === HOURLY_MODEL_OTHER_KEY) {
        colorByKey[key] = "rgba(148,163,184,0.58)";
        classByKey[key] = "bg-slate-400";
        return;
      }
      colorByKey[key] = HOURLY_MODEL_COLORS[index % HOURLY_MODEL_COLORS.length];
      classByKey[key] = palette[index % palette.length] ?? "bg-slate-400";
    });

    colorByKey[HOURLY_MODEL_TOTAL_KEY] = "#3b82f6";
    classByKey[HOURLY_MODEL_TOTAL_KEY] = "bg-blue-500";

    return { colorByKey, classByKey };
  }, [hourlySeries.modelKeys]);

  const hourlyTokenPalette = useMemo(() => {
    return {
      colorByKey: {
        [HOURLY_TOKEN_KEYS.input]: "rgba(110,231,183,0.88)",
        [HOURLY_TOKEN_KEYS.output]: "rgba(196,181,253,0.88)",
        [HOURLY_TOKEN_KEYS.reasoning]: "rgba(252,211,77,0.88)",
        [HOURLY_TOKEN_KEYS.cached]: "rgba(94,234,212,0.88)",
        [HOURLY_TOKEN_KEYS.total]: "#3b82f6",
      } as Record<string, string>,
      classByKey: {
        [HOURLY_TOKEN_KEYS.input]: "bg-emerald-400",
        [HOURLY_TOKEN_KEYS.output]: "bg-violet-400",
        [HOURLY_TOKEN_KEYS.reasoning]: "bg-amber-400",
        [HOURLY_TOKEN_KEYS.cached]: "bg-teal-400",
        [HOURLY_TOKEN_KEYS.total]: "bg-blue-500",
      } as Record<string, string>,
    };
  }, []);

  useEffect(() => {
    setHourlyModelSelected((prev) => {
      const next = { ...prev };
      for (const key of hourlySeries.modelKeys) {
        if (!(key in next)) next[key] = true;
      }
      if (!(HOURLY_MODEL_TOTAL_KEY in next)) next[HOURLY_MODEL_TOTAL_KEY] = true;
      return next;
    });
  }, [hourlySeries.modelKeys]);

  useEffect(() => {
    setHourlyTokenSelected((prev) => {
      const next = { ...prev };
      for (const key of hourlySeries.tokenKeys) {
        if (!(key in next)) next[key] = true;
      }
      if (!(HOURLY_TOKEN_KEYS.total in next)) next[HOURLY_TOKEN_KEYS.total] = true;
      return next;
    });
  }, [hourlySeries.tokenKeys]);

  const modelDistributionOption = useMemo(
    () => createModelDistributionOption({ isDark, data: visibleModelDistributionData }),
    [isDark, visibleModelDistributionData],
  );

  // --- API Key Distribution ---
  const apikeyDistributionData = useMemo(() => {
    if (!chartData?.apikey_distribution) return [];
    const sorted = [...chartData.apikey_distribution].sort((a, b) => {
      const av = apikeyMetric === "requests" ? a.requests : a.tokens;
      const bv = apikeyMetric === "requests" ? b.requests : b.tokens;
      return bv - av;
    });
    const top = sorted.slice(0, 10);
    const otherValue = sorted.slice(10).reduce((acc, item) => {
      return acc + (apikeyMetric === "requests" ? item.requests : item.tokens);
    }, 0);
    const data = top.map((item) => ({
      name: item.name || `Key #${item.api_key_id}`,
      value: apikeyMetric === "requests" ? item.requests : item.tokens,
    }));
    if (otherValue > 0) {
      data.push({ name: t("common.other"), value: otherValue });
    }
    return data;
  }, [apikeyMetric, chartData, t]);

  useEffect(() => {
    setApikeyDistributionSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const item of apikeyDistributionData) {
        next[item.name] = prev[item.name] ?? true;
      }
      return next;
    });
  }, [apikeyDistributionData]);

  const visibleApikeyDistributionData = useMemo(
    () => apikeyDistributionData.filter((item) => apikeyDistributionSelected[item.name] ?? true),
    [apikeyDistributionData, apikeyDistributionSelected],
  );

  const apikeyDistributionOption = useMemo(
    () => createModelDistributionOption({ isDark, data: visibleApikeyDistributionData }),
    [isDark, visibleApikeyDistributionData],
  );

  const apikeyDistributionLegend = useMemo(() => {
    const total = apikeyDistributionData.reduce(
      (acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0),
      0,
    );
    return apikeyDistributionData.map((item, index) => {
      const colorClass =
        index < CHART_COLOR_CLASSES.length ? CHART_COLOR_CLASSES[index] : "bg-slate-400";
      const value = Number(item.value ?? 0);
      const percent = total > 0 ? (value / total) * 100 : 0;
      return {
        name: item.name,
        valueLabel: formatCompact(value),
        percentLabel: `${percent.toFixed(1)}%`,
        colorClass,
        enabled: apikeyDistributionSelected[item.name] ?? true,
      };
    });
  }, [apikeyDistributionData, apikeyDistributionSelected]);

  const dailyLegendAvailability = useMemo(() => {
    const points = dailySeries.filter(
      (item) => item.requests > 0 || item.inputTokens > 0 || item.outputTokens > 0,
    );
    const visiblePoints = points.length > 0 ? points : dailySeries;
    const requestY = visiblePoints.map((item) => item.requests);
    const inputY = visiblePoints.map((item) => item.inputTokens);
    const outputY = visiblePoints.map((item) => item.outputTokens);

    return {
      hasInput: inputY.some((value) => value > 0),
      hasOutput: outputY.some((value) => value > 0),
      hasRequests: requestY.some((value) => value > 0),
    };
  }, [dailySeries]);

  const modelDistributionLegend = useMemo(() => {
    const total = modelDistributionData.reduce(
      (acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0),
      0,
    );

    return modelDistributionData.map((item, index) => {
      const colorClass =
        index < CHART_COLOR_CLASSES.length ? CHART_COLOR_CLASSES[index] : "bg-slate-400";
      const value = Number(item.value ?? 0);
      const percent = total > 0 ? (value / total) * 100 : 0;

      return {
        name: item.name,
        valueLabel: formatCompact(value),
        percentLabel: `${percent.toFixed(1)}%`,
        colorClass,
        enabled: modelDistributionSelected[item.name] ?? true,
      };
    });
  }, [modelDistributionData, modelDistributionSelected]);

  const toggleModelDistributionLegend = useCallback((name: string) => {
    setModelDistributionSelected((prev) => ({ ...prev, [name]: !(prev[name] ?? true) }));
  }, []);

  const toggleApikeyDistributionLegend = useCallback((name: string) => {
    setApikeyDistributionSelected((prev) => ({ ...prev, [name]: !(prev[name] ?? true) }));
  }, []);

  const dailyTrendOption = useMemo(
    () =>
      createDailyTrendOption({
        dailySeries,
        dailyLegendSelected,
        legendKeys: DAILY_LEGEND_KEYS,
        labels: {
          input: t("monitor.input_token"),
          output: t("monitor.output_token_legend"),
          requests: t("monitor.requests"),
          tokenAxis: t("monitor.token"),
          requestAxis: t("monitor.requests"),
        },
        isDark,
        compact,
      }),
    [compact, dailyLegendSelected, dailySeries, isDark, t],
  );

  const getHourlyModelSeriesLabel = useCallback(
    (key: string) => {
      if (key === HOURLY_MODEL_OTHER_KEY) return t("common.other");
      if (key === HOURLY_MODEL_TOTAL_KEY) return t("monitor.total_requests");
      return key;
    },
    [t],
  );

  const hourlyTokenLabels = useMemo(
    () => ({
      [HOURLY_TOKEN_KEYS.input]: t("monitor.hourly_token.input"),
      [HOURLY_TOKEN_KEYS.output]: t("monitor.hourly_token.output"),
      [HOURLY_TOKEN_KEYS.reasoning]: t("monitor.hourly_token.reasoning"),
      [HOURLY_TOKEN_KEYS.cached]: t("monitor.hourly_token.cached"),
      [HOURLY_TOKEN_KEYS.total]: t("monitor.hourly_token.total"),
    }),
    [t],
  );

  const hourlyModelOption = useMemo(
    () =>
      createHourlyModelOption({
        hourlySeries,
        modelHourWindow,
        hourlyModelSelected,
        paletteColorByKey: hourlyModelPalette.colorByKey,
        totalLineKey: HOURLY_MODEL_TOTAL_KEY,
        getSeriesLabel: getHourlyModelSeriesLabel,
        isDark,
        compact,
      }),
    [
      compact,
      getHourlyModelSeriesLabel,
      hourlyModelPalette.colorByKey,
      hourlyModelSelected,
      hourlySeries.modelKeys,
      hourlySeries.modelPoints,
      isDark,
      modelHourWindow,
    ],
  );

  const hourlyTokenOption = useMemo(
    () =>
      createHourlyTokenOption({
        hourlySeries,
        tokenHourWindow,
        hourlyTokenSelected,
        paletteColorByKey: hourlyTokenPalette.colorByKey,
        labelsByKey: hourlyTokenLabels,
        totalLineKey: HOURLY_TOKEN_KEYS.total,
        isDark,
        compact,
      }),
    [
      compact,
      hourlySeries.tokenKeys,
      hourlySeries.tokenPoints,
      hourlyTokenLabels,
      hourlyTokenPalette.colorByKey,
      hourlyTokenSelected,
      isDark,
      tokenHourWindow,
    ],
  );

  const hourlyModelLegendKeys = useMemo(
    () => [...hourlySeries.modelKeys, HOURLY_MODEL_TOTAL_KEY],
    [hourlySeries.modelKeys],
  );

  return (
    <div className="space-y-4">
      <MonitorToolbarSection
        t={t}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        apiKeyOptions={apiKeyOptions}
        apiFilterInput={apiFilterInput}
        setApiFilterInput={(value) => {
          setApiFilterInput(value);
          // Apply filter immediately when selection changes
          setApiFilter(value);
        }}
        applyFilter={applyFilter}
        refreshData={() => void refreshData()}
        isLoading={isLoading}
        error={error}
      />

      <MonitorKpiSection
        t={t}
        metrics={metrics}
        hasData={hasData}
        isLoading={isLoading}
        refreshData={refreshData}
      />

      {hasData ? (
        <>
          <MonitorDistributionSections
            t={t}
            timeRange={timeRange}
            modelMetric={modelMetric}
            setModelMetric={setModelMetric}
            modelDistributionOption={modelDistributionOption}
            modelDistributionLegend={modelDistributionLegend}
            toggleModelDistributionLegend={toggleModelDistributionLegend}
            dailyTrendOption={dailyTrendOption}
            dailyLegendAvailability={dailyLegendAvailability}
            dailyLegendSelected={dailyLegendSelected}
            toggleDailyLegend={toggleDailyLegend}
            apikeyDistributionData={apikeyDistributionData}
            apikeyMetric={apikeyMetric}
            setApikeyMetric={setApikeyMetric}
            apikeyDistributionOption={apikeyDistributionOption}
            apikeyDistributionLegend={apikeyDistributionLegend}
            toggleApikeyDistributionLegend={toggleApikeyDistributionLegend}
            isRefreshing={isRefreshing}
          />

          <MonitorHourlySections
            t={t}
            isRefreshing={isRefreshing}
            modelHourWindow={modelHourWindow}
            setModelHourWindow={setModelHourWindow}
            hourlyModelLegendKeys={hourlyModelLegendKeys}
            hourlyModelOption={hourlyModelOption}
            hourlySeries={hourlySeries}
            getHourlyModelSeriesLabel={getHourlyModelSeriesLabel}
            hourlyModelPalette={hourlyModelPalette}
            hourlyModelSelected={hourlyModelSelected}
            toggleHourlyModelLegend={toggleHourlyModelLegend}
            tokenHourWindow={tokenHourWindow}
            setTokenHourWindow={setTokenHourWindow}
            hourlyTokenOption={hourlyTokenOption}
            hourlyTokenLabels={hourlyTokenLabels}
            hourlyTokenPalette={hourlyTokenPalette}
            hourlyTokenSelected={hourlyTokenSelected}
            toggleHourlyTokenLegend={toggleHourlyTokenLegend}
          />
        </>
      ) : null}
    </div>
  );
}
