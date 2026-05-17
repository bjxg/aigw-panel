import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { apiClient } from "@/lib/http/client";
import { ChannelGroupsPage } from "@/modules/channel-groups/ChannelGroupsPage";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";
import { ToastProvider } from "@/modules/ui/ToastProvider";

const toastMocks = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("goey-toast", () => ({
  GoeyToaster: () => null,
  goeyToast: {
    info: toastMocks.info,
    success: toastMocks.success,
    warning: toastMocks.warning,
    error: toastMocks.error,
  },
}));

vi.mock("@/lib/http/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApiGet = vi.mocked(apiClient.get);

function renderPage() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <ChannelGroupsPage />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe("ChannelGroupsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("zh-CN");
    window.localStorage.clear();
    toastMocks.info.mockReset();
    toastMocks.success.mockReset();
    toastMocks.warning.mockReset();
    toastMocks.error.mockReset();
    mockedApiGet.mockReset();
    mockedApiGet.mockImplementation((path: string) => {
      if (path === "/routing-config") {
        return Promise.resolve({
          strategy: "round-robin",
          "include-default-group": true,
          "channel-groups": [],
          "path-routes": [],
        });
      }
      if (path === "/channel-groups") {
        return Promise.resolve({
          items: [{ name: "Claude Pool", channels: ["Team A Claude"] }],
        });
      }
      if (path.startsWith("/models?")) {
        return Promise.resolve({
          data: [{ id: "claude-3-7-sonnet-latest" }, { id: "gpt-should-not-leak" }],
        });
      }
      if (path === "/model-definitions/claude") {
        return Promise.resolve({
          data: [
            {
              id: "claude-3-7-sonnet-latest",
              owned_by: "anthropic",
              display_name: "Mapped Claude model",
            },
          ],
        });
      }
      if (path === "/model-configs?scope=library") {
        return Promise.resolve({
          data: [
            {
              id: "claude-3-7-sonnet-latest",
              owned_by: "anthropic",
              description: "Mapped Claude model",
              pricing: {
                mode: "token",
                input_price_per_million: 3,
                output_price_per_million: 15,
                cached_price_per_million: 0.3,
              },
            },
            {
              id: "gpt-should-not-leak",
              owned_by: "openai",
              description: "Unmapped OpenAI model",
            },
          ],
        });
      }
      if (
        path === "/gemini-api-key" ||
        path === "/codex-api-key" ||
        path === "/opencode-go-api-key" ||
        path === "/vertex-api-key" ||
        path === "/openai-compatibility"
      ) {
        return Promise.resolve([]);
      }
      if (path === "/claude-api-key") {
        return Promise.resolve([{ name: "Team A Claude", apiKey: "sk-claude" }]);
      }
      return Promise.resolve({});
    });
  });

  test("filters group editor models by configured provider channels", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole("button", { name: "新增分组" }));
    await user.type(screen.getByPlaceholderText("pro"), "team-claude");
    await user.type(screen.getByPlaceholderText("/pro"), "/team-claude");
    await user.click(screen.getByRole("combobox", { name: "选择渠道" }));
    await user.click(await screen.findByRole("option", { name: "Team A Claude" }));
    await user.click(screen.getByRole("combobox", { name: "选择渠道" }));

    await user.click(screen.getByRole("tab", { name: "模型列表" }));

    expect(await screen.findByRole("table", { name: "允许模型" })).toBeInTheDocument();
    expect(await screen.findByLabelText("claude-3-7-sonnet-latest")).toBeInTheDocument();
    expect(screen.getByText("Mapped Claude model")).toBeInTheDocument();
    expect(screen.queryByLabelText("gpt-should-not-leak")).not.toBeInTheDocument();
  });

  test("shows channel tags in the selector options and selected rows", async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === "/routing-config") {
        return Promise.resolve({
          strategy: "round-robin",
          "include-default-group": true,
          "channel-groups": [],
          "path-routes": [],
        });
      }
      if (path === "/channel-groups") {
        return Promise.resolve({
          items: [
            {
              name: "Codex Pool",
              channels: ["A_GptPro"],
              "channel-details": [
                {
                  name: "A_GptPro",
                  source: "auth-file",
                  default_tags: ["codex", "pro"],
                  custom_tags: ["vip"],
                  hidden_default_tags: [],
                  display_tags: ["codex", "pro", "vip"],
                },
              ],
            },
          ],
        });
      }
      if (path.startsWith("/models?")) {
        return Promise.resolve({ data: [] });
      }
      if (
        path === "/model-configs?scope=library" ||
        path === "/gemini-api-key" ||
        path === "/claude-api-key" ||
        path === "/codex-api-key" ||
        path === "/opencode-go-api-key" ||
        path === "/vertex-api-key" ||
        path === "/openai-compatibility"
      ) {
        return Promise.resolve({ files: [], data: [] });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "新增分组" }));
    await user.click(screen.getByRole("combobox", { name: "选择渠道" }));

    const option = await screen.findByRole("option", { name: "A_GptPro" });
    expect(option).toHaveTextContent("codex");
    expect(option).toHaveTextContent("pro");
    expect(option).toHaveTextContent("vip");

    await user.click(option);

    const selectedChannelsTable = screen.getByRole("table", { name: "选择渠道" });
    const rowText = within(selectedChannelsTable).getByText("A_GptPro");
    const row = rowText.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLTableRowElement).getByText("codex")).toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByText("pro")).toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByText("vip")).toBeInTheDocument();
  });
});
