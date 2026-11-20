// =====================================================================
// Клиент REST API (src/routes/api/** — пишет бэкенд).
//
// Формат ошибок API (hooks.server.ts → handleError, App.Error):
//   400 { message, formErrors?: string[], fieldErrors?: { поле: string[] } }
//   401 — нет входа, 403 — нет прав, 404 — не найдено, 409 — конфликт.
//
// В load-функциях (+page.ts) передавайте `fetch` из аргумента load —
// тогда при SSR передаются cookie сессии:
//   export const load: PageLoad = async ({ fetch }) => ({
//     users: await api.get<UsersPage>("/api/users", { fetch, query: { status: "pending" } }),
//   });
// =====================================================================

export type FieldErrors = Partial<Record<string, string[]>>;

export class ApiError extends Error {
  public readonly status: number;
  public readonly formErrors: string[];
  public readonly fieldErrors: FieldErrors;

  public constructor(
    status: number,
    message: string,
    formErrors: string[],
    fieldErrors: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.formErrors = formErrors;
    this.fieldErrors = fieldErrors;
  }

  /** Текст для всплывающего уведомления или общего блока ошибки формы */
  public get userMessage(): string {
    if (this.formErrors.length > 0) return this.formErrors.join(". ");
    return (
      defaultMessages[this.status] ?? (this.message || "Что-то пошло не так. Попробуйте ещё раз")
    );
  }
}

const defaultMessages: Partial<Record<number, string>> = {
  400: "Проверьте введённые данные",
  401: "Сессия истекла. Войдите снова",
  403: "Недостаточно прав для этого действия",
  404: "Не найдено",
  409: "Такая запись уже существует",
  429: "Слишком много попыток. Попробуйте позже",
  500: "Ошибка на сервере. Попробуйте позже",
};

export type Pagination = { total: number; page: number; pageSize: number; totalPages: number };
export type Paginated<T> = { data: T[]; pagination: Pagination };

type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  fetch?: typeof fetch;
  query?: Record<string, QueryValue | QueryValue[]>;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v !== undefined && v !== null && v !== "") params.append(key, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const doFetch = options.fetch ?? fetch;
  const isForm = body instanceof FormData;

  const response = await doFetch(buildUrl(path, options.query), {
    method,
    headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    signal: options.signal,
  });

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    const err = (data ?? {}) as {
      message?: string;
      formErrors?: string[];
      fieldErrors?: FieldErrors;
    };
    throw new ApiError(
      response.status,
      err.message ?? response.statusText,
      err.formErrors ?? [],
      err.fieldErrors ?? {},
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>("PATCH", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>("PUT", path, body, options),
  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>("DELETE", path, undefined, options),
};
