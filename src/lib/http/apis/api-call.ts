import { apiClient } from "@/lib/http/client";
import type { ApiCallRequest, ApiCallResult } from "@/lib/http/types";

export const getApiCallErrorMessage = (result: ApiCallResult): string => {
  const status = result.statusCode;
  const body = result.body;
  const bodyText = result.bodyText;
  let message = "";

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const errorValue = (body as Record<string, unknown>).error;
    if (errorValue && typeof errorValue === "object" && typeof (errorValue as Record<string, unknown>).message === "string") {
      message = (errorValue as Record<string, unknown>).message as string;
    } else if (typeof errorValue === "string") {
      message = errorValue;
    }
    if (!message && typeof (body as Record<string, unknown>).message === "string") {
      message = (body as Record<string, unknown>).message as string;
    }
  } else if (typeof body === "string") {
    message = body;
  }

  if (!message && bodyText) {
    message = bodyText;
  }

  if (status && message) return `${status} ${message}`.trim();
  if (status) return `HTTP ${status}`;
  return message || "Request failed";
};

export const apiCallApi = {
  request: async (payload: ApiCallRequest): Promise<ApiCallResult> => {
    const response = await fetch(payload.url, {
      method: payload.method,
      headers: payload.header,
      body: payload.data,
    });

    const bodyText = await response.text().catch(() => "");
    let body: unknown = bodyText;
    try {
      body = JSON.parse(bodyText);
    } catch {
      // keep as text
    }

    const header: Record<string, string[]> = {};
    response.headers.forEach((value, key) => {
      header[key] = header[key] ? [...header[key], value] : [value];
    });

    return {
      statusCode: response.status,
      header,
      body,
      bodyText,
    };
  },
};
