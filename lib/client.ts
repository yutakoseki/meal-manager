"use client";

export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const init: RequestInit = { ...options };
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  init.headers = headers;

  const response = await fetch(url, init);
  if (!response.ok) {
    let message = "リクエストに失敗しました";
    try {
      const error = await response.json();
      message = error?.message ?? message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
