import type { AuthFileItem } from "@/lib/http/types";

export interface AuthFilesResponse {
  files: AuthFileItem[];
  total?: number;
}

type ModelDefinition = { id: string; display_name?: string; type?: string; owned_by?: string };

export const authFilesApi = {
  list: (): Promise<AuthFilesResponse> => Promise.resolve({ files: [] }),
  setStatus: (_name: string, _disabled: boolean) => Promise.resolve({ status: "ok" }),
  upload: (_file: File) => Promise.resolve({ status: "ok" }),
  deleteFile: (_name: string) => Promise.resolve({ status: "ok" }),
  deleteAll: () => Promise.resolve({ status: "ok" }),
  downloadText: (_name: string) => Promise.resolve(""),
  downloadFile: (_name: string) => Promise.resolve(),
  patchFields: (_payload: Record<string, unknown>) => Promise.resolve({ status: "ok" }),
  getModelsForAuthFile: (_name: string): Promise<ModelDefinition[]> => Promise.resolve([]),
  getModelDefinitions: (_channel?: string): Promise<ModelDefinition[]> => Promise.resolve([]),
};
