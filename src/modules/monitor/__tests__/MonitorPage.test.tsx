import { usePersistedDateRange } from "@/lib/date-range";
import { useMonitorDashboardState } from "@/modules/monitor/hooks/useMonitorDashboardState";
import { act, renderHook, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MonitorDistributionSections } from "@/modules/monitor/MonitorDashboardSections";

vi.mock("@/modules/ui/charts/EChart", () => ({
  EChart: ({ className }: { className?: string }) => <div className={className}>chart</div>,
}));

describe("MonitorPage distribution legends", () => {
  test("renders model distribution legend rows as toggle buttons", async () => {
    const user = userEvent.setup();
    const toggleModelDistributionLegend = vi.fn();

    render(
      <MonitorDistributionSections
        t={(key) => {
          if (key === "monitor.model_distribution") return "Model distribution";
          if (key === "monitor.last_days_desc") return "Last 7 days";
          if (key === "monitor.requests") return "Requests";
          if (key === "monitor.token") return "Tokens";
          if (key === "monitor.daily_usage_trend") return "Daily usage";
          if (key === "monitor.daily_desc") return "Daily trend";
          if (key === "monitor.input_token") return "Input";
          if (key === "monitor.output_token_legend") return "Output";
          if (key === "monitor.request_count_legend") return "Requests";
          if (key === "monitor.apikey_distribution") return "API key distribution";
          return key;
        }}
        rangeLabel="Last 7 days"
        modelMetric="requests"
        setModelMetric={() => undefined}
        modelDistributionOption={{}}
        modelDistributionLegend={[
          {
            name: "gpt-4.1",
            valueLabel: "10",
            percentLabel: "71.4%",
            colorClass: "bg-sky-500",
            enabled: true,
          },
        ]}
        toggleModelDistributionLegend={toggleModelDistributionLegend}
        dailyTrendOption={{}}
        dailyLegendAvailability={{ hasInput: true, hasOutput: true, hasRequests: true }}
        dailyLegendSelected={{ daily_input: true, daily_output: true, daily_requests: true }}
        toggleDailyLegend={() => undefined}
        apikeyDistributionData={[]}
        apikeyMetric="requests"
        setApikeyMetric={() => undefined}
        apikeyDistributionOption={{}}
        apikeyDistributionLegend={[]}
        toggleApikeyDistributionLegend={() => undefined}
        isRefreshing={false}
      />,
    );

    const legendButton = await screen.findByRole("button", { name: /gpt-4\.1/i });
    expect(legendButton).toHaveAttribute("aria-pressed", "true");

    await user.click(legendButton);

    await waitFor(() => {
      expect(toggleModelDistributionLegend).toHaveBeenCalledWith("gpt-4.1");
    });
  });
});

describe("监控日期记忆", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      clear: () => values.clear(),
    });
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("重新进入时恢复日期标签", () => {
    const first = renderHook(() => useMonitorDashboardState());
    act(() => first.result.current.setTimeRange({ kind: "preset", preset: "yesterday" }));
    first.unmount();
    const next = renderHook(() => useMonitorDashboardState());
    expect(next.result.current.timeRange).toEqual({ kind: "preset", preset: "yesterday" });
  });

  test("监控中心与其他页面双向共享日期缓存", () => {
    const monitor = renderHook(() => useMonitorDashboardState());
    act(() => monitor.result.current.setTimeRange({ kind: "preset", preset: "today" }));
    monitor.unmount();
    const dashboard = renderHook(() => usePersistedDateRange());
    expect(dashboard.result.current[0]).toEqual({ kind: "preset", preset: "today" });
    act(() =>
      dashboard.result.current[1]({ kind: "custom", start: "2026-10-01", end: "2026-10-15" }),
    );
    dashboard.unmount();
    const logs = renderHook(() => usePersistedDateRange());
    expect(logs.result.current[0]).toEqual({
      kind: "custom",
      start: "2026-10-01",
      end: "2026-10-15",
    });
    act(() => logs.result.current[1]({ kind: "preset", preset: "30d" }));
    logs.unmount();
    expect(renderHook(() => useMonitorDashboardState()).result.current.timeRange).toEqual({
      kind: "preset",
      preset: "30d",
    });
  });

  test("恢复自定义日期", () => {
    const range = { kind: "custom", start: "2026-10-01", end: "2026-10-15" } as const;
    const first = renderHook(() => useMonitorDashboardState());
    act(() => first.result.current.setTimeRange(range));
    first.unmount();
    expect(renderHook(() => useMonitorDashboardState()).result.current.timeRange).toEqual(range);
  });

  test.each([
    "broken",
    '{"kind":"preset","preset":"invalid"}',
    '{"kind":"custom","start":"2026-02-30","end":"2026-03-01"}',
  ])("无效存储回退默认值：%s", (value) => {
    window.localStorage.setItem("monitor:time-range:v1", value);
    expect(renderHook(() => useMonitorDashboardState()).result.current.timeRange).toEqual({
      kind: "preset",
      preset: "7d",
    });
  });

  test("浏览器禁用存储时仍可切换日期", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const hook = renderHook(() => useMonitorDashboardState());
    act(() => hook.result.current.setTimeRange({ kind: "preset", preset: "today" }));
    expect(hook.result.current.timeRange).toEqual({ kind: "preset", preset: "today" });
  });
});
