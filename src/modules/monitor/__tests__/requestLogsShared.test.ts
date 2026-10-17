import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, test } from "vitest";
import {
  buildRequestLogKeyOptions,
  buildRequestLogsColumns,
  isSystemRequestLogKey,
  SYSTEM_REQUEST_LOG_FILTER_VALUE,
  toRequestLogsRow,
} from "@/modules/monitor/requestLogsShared";

describe("requestLogsShared", () => {
  test("recognizes system request logs by api_key_id === 0", () => {
    expect(isSystemRequestLogKey(0)).toBe(true);
    expect(isSystemRequestLogKey(1)).toBe(false);
    expect(isSystemRequestLogKey(42)).toBe(false);
  });

  test("marks system-triggered logs so key name can render as system call", () => {
    const row = toRequestLogsRow({
      id: 1,
      timestamp: "2026-04-23T10:00:00Z",
      api_key_id: 0,
      api_key_name: "",
      model: "gpt-image-2",
      source: "codex",
      channel_name: "GptPlus1",
      auth_index: "auth-1",
      failed: false,
      latency_ms: 1200,
      first_token_ms: 300,
      input_tokens: 10,
      output_tokens: 20,
      reasoning_tokens: 0,
      cached_tokens: 0,
      total_tokens: 30,
      cost: 0.01,
      has_content: true,
    });

    expect(row.clientName).toBe("");
    expect(row.clientVersion).toBe("");
    expect(row.isSystemCall).toBe(true);
    expect(row.apiKeyID).toBe(0);
    expect(row.apiKeyName).toBe("");
  });

  test("builds key options from APIKeyFilterItem list", () => {
    const options = buildRequestLogKeyOptions(
      [
        { id: 1, name: "Live Key" },
        { id: 2, name: "Test Key" },
      ],
      { allKeys: "全部密钥", systemCall: "系统调用" },
    );

    // Should have: all keys option, system call option, and 2 key options
    expect(options).toHaveLength(4);
    expect(options[0].value).toBe(""); // All keys
    expect(options[1].value).toBe(SYSTEM_REQUEST_LOG_FILTER_VALUE); // System call
    expect(options.find((option) => option.label === "Live Key")?.value).toBe("1");
    expect(options.find((option) => option.label === "Test Key")?.value).toBe("2");
  });

  test("uses Key #id as fallback when name is empty", () => {
    const options = buildRequestLogKeyOptions([{ id: 5, name: "" }], {
      allKeys: "All Keys",
      systemCall: "System",
    });

    const keyOption = options.find((option) => option.value === "5");
    expect(keyOption?.label).toBe("Key #5");
  });
});

describe("客户端悬停提示", () => {
  test.each([
    ["codex", "0.125.0", "codex_cli_rs"],
    ["pi", "", "pi (darwin; arm64)"],
    ["", "0.125.0", "pi (darwin; arm64)"],
    ["", "", "pi (darwin; arm64)"],
  ])("名称=%s 版本=%s", (name, version, expected) => {
    const row = toRequestLogsRow({
      id: 1,
      timestamp: "2026-10-17T00:00:00Z",
      api_key_id: 1,
      api_key_name: "test",
      model: "test",
      source: "test",
      channel_name: "test",
      auth_index: "",
      failed: false,
      latency_ms: 0,
      first_token_ms: 0,
      input_tokens: 0,
      output_tokens: 0,
      reasoning_tokens: 0,
      cached_tokens: 0,
      total_tokens: 0,
      cost: 0,
      has_content: false,
      client_name: name,
      client_version: version,
      client_variant: "codex_cli_rs",
      client_user_agent: "pi (darwin; arm64)",
    });
    const column = buildRequestLogsColumns((key) => key).find((item) => item.key === "clientName")!;
    const { container } = render(createElement("div", {}, column.render(row, 0)));
    const label = container.querySelector("span[tabindex]")!;
    fireEvent.mouseEnter(label.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent(expected);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
