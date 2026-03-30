import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "../src/token-manager.js";
import type { TokenState } from "../src/types.js";

function createTokenState(overrides?: Partial<TokenState>): TokenState {
  return {
    accessToken: "test-token",
    accessExpiresAt: Date.now() + 300_000,
    ...overrides,
  };
}

describe("TokenManager", () => {
  let acquireFn: ReturnType<typeof vi.fn>;
  let manager: TokenManager;

  beforeEach(() => {
    acquireFn = vi.fn(async () => createTokenState());
    manager = new TokenManager(acquireFn);
  });

  it("acquires a token on first call", async () => {
    const token = await manager.getToken();
    expect(token).toBe("test-token");
    expect(acquireFn).toHaveBeenCalledOnce();
  });

  it("returns cached token on subsequent calls", async () => {
    await manager.getToken();
    await manager.getToken();
    await manager.getToken();
    expect(acquireFn).toHaveBeenCalledOnce();
  });

  it("re-acquires when token is within refresh buffer", async () => {
    acquireFn = vi.fn(async () => createTokenState({ accessExpiresAt: Date.now() + 10_000 }));
    manager = new TokenManager(acquireFn, 30);

    await manager.getToken();
    await manager.getToken();
    expect(acquireFn).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent token requests", async () => {
    let resolveAcquire: (state: TokenState) => void;
    acquireFn = vi.fn(
      () =>
        new Promise<TokenState>((resolve) => {
          resolveAcquire = resolve;
        }),
    );
    manager = new TokenManager(acquireFn);

    const p1 = manager.getToken();
    const p2 = manager.getToken();
    const p3 = manager.getToken();

    // biome-ignore lint/style/noNonNullAssertion: set by the promise callback
    resolveAcquire!(createTokenState({ accessToken: "deduped-token" }));

    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
    expect(t1).toBe("deduped-token");
    expect(t2).toBe("deduped-token");
    expect(t3).toBe("deduped-token");
    expect(acquireFn).toHaveBeenCalledOnce();
  });

  it("reset() forces re-acquisition", async () => {
    await manager.getToken();
    manager.reset();
    await manager.getToken();
    expect(acquireFn).toHaveBeenCalledTimes(2);
  });

  it("state getter/setter works", () => {
    expect(manager.state).toBeNull();
    const s = createTokenState();
    manager.state = s;
    expect(manager.state).toBe(s);
  });

  it("propagates acquire errors", async () => {
    acquireFn = vi.fn(async () => {
      throw new Error("auth failed");
    });
    manager = new TokenManager(acquireFn);

    await expect(manager.getToken()).rejects.toThrow("auth failed");
  });

  it("retries after a failed acquisition", async () => {
    let calls = 0;
    acquireFn = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error("transient");
      return createTokenState();
    });
    manager = new TokenManager(acquireFn);

    await expect(manager.getToken()).rejects.toThrow("transient");
    const token = await manager.getToken();
    expect(token).toBe("test-token");
    expect(acquireFn).toHaveBeenCalledTimes(2);
  });
});
