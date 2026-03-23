import { type Mock, vi } from "vitest";
import type { MockHttpResponse } from "../fixtures/responses.js";

export function createMockFetch(responses: MockHttpResponse[]): Mock {
  const queue = [...responses];
  return vi.fn(async () => {
    const resp = queue.shift();
    if (!resp) throw new Error("No more mock responses");
    return {
      status: resp.status,
      json: async () => resp.body,
      text: async () => JSON.stringify(resp.body),
    } as Response;
  });
}

export function createTestClientConfig(mockFetch: Mock, overrides?: Record<string, unknown>) {
  return {
    projectId: "proj-id",
    projectSecret: "proj-secret",
    baseUrl: "https://api.test.local",
    fetch: mockFetch as unknown as typeof globalThis.fetch,
    ...overrides,
  };
}
