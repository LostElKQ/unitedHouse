# Руководство для участников команды (CONTRIBUTING)

Добро пожаловать в проект **UnitedHouse**! В этом документе описаны правила разработки, процесс локальной настройки окружения, стандарты написания кода и регламент создания Pull Request (PR).

---

## 📋 Содержание

- [Стек технологий](#стек-технологий)
- [Системные требования](#системные-требования)
- [Быстрый старт (локальная разработка)](#быстрый-старт-локальная-разработка)
- [Переменные окружения](#переменные-окружения)
- [Работа с базой данных](#работа-с-базой-данных)
- [Запуск через Docker (Nginx + SSL)](#запуск-через-docker-nginx--ssl)
- [Доступные npm-скрипты](#доступные-npm-скрипты)
- [Стандарты и конвенции кода](#стандарты-и-конвенции-кода)
  - [TypeScript](#typescript)
  - [Svelte 5 (Runes)](#svelte-5-runes)
  - [Стилизация (Tailwind CSS v4)](#стилизация-tailwind-css-v4)
- [Тестирование](#тестирование)
- [Git Workflow и правила коммитов](#git-workflow-и-правила-коммитов)
- [Чеклист перед отправкой PR](#чеклист-перед-отправкой-pr)

---

## 🛠 Стек технологий

- **Фреймворк**: [SvelteKit](https://kit.svelte.dev/) 3 + [Svelte 5](https://svelte.dev/) (строго в режиме **Runes**)
- **Язык**: [TypeScript](https://www.typescriptlang.org/) (строгий режим, `type` вместо `interface`)
- **Стилизация**: [Tailwind CSS v4](https://tailwindcss.com/)
- **База данных**: [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Аутентификация**: [Better Auth](https://www.better-auth.com/)
- **Тестирование**: [Vitest](https://vitest.dev/) (Unit-тесты + Playwright Browser Testing)
- **Линтинг и форматирование**: [ESLint 10](https://eslint.org/) + [Prettier](https://prettier.io/)
- **Контейнеризация**: Docker, Docker Compose, Nginx (reverse proxy с поддержкой SSL)
- **Пакетный менеджер**: **npm** (`npm@^11`)

---

## 💻 Системные требования

Перед началом работы убедитесь, что у вас установлены:
- **Node.js**: `20.x` или выше (рекомендуется `26.x`, см. `package.json -> devEngines`)
- **npm**: `^11.x`
- **Docker** и **Docker Compose**
- **mkcert** (рекомендуется для генерации локальных доверенных SSL-сертификатов) или **OpenSSL**

---

## 🚀 Быстрый старт (локальная разработка)

### 1. Клонирование репозитория и установка зависимостей

```bash
git clone <url-репозитория>
cd unitedHouse
npm install
```

> **Важно**: В проекте используется менеджер пакетов **npm** (не pnpm/yarn). Пожалуйста, не фиксируйте `pnpm-lock.yaml` или `yarn.lock`.

### 2. Установка браузеров для тестов Playwright

Для работы компонентных тестов в Vitest требуется браузер Playwright:

```bash
npx playwright install chromium
```

### 3. Настройка переменных окружения

Скопируйте пример конфигурации:

```bash
cp .env.example .env
```

Заполните значения в `.env`:
- Сгенерируйте секрет `BETTER_AUTH_SECRET` (минимум 32 символа):
  ```bash
  openssl rand -base64 32
  ```
- Укажите параметры подключения к БД (по умолчанию для локального Docker Compose):
  ```env
  DATABASE_USER=root
  DATABASE_PASSWORD=mysecretpassword
  DATABASE_HOST=localhost
  DATABASE_NAME=local
  DATABASE_URL="postgres://root:mysecretpassword@localhost:5432/local"
  ORIGIN="http://localhost:5173"
  BETTER_AUTH_SECRET="ваш-сгенерированный-секрет"
  ```

### 4. Запуск локальной базы данных

Поднимите контейнер PostgreSQL:

```bash
npm run db:start
```

### 5. Запуск сервера разработки

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:5173](http://localhost:5173).

---

## 🗄 Работа с базой данных

Мы используем [Drizzle ORM](https://orm.drizzle.team/). Все схемы лежат в каталоге `src/lib/server/db/`:
- `schema.ts` — корневой экспорт схемы
- `main.schema.ts` — бизнес-сущности приложения
- `auth.schema.ts` — таблицы аутентификации Better Auth
- `enums.ts` — перечисления (PostgreSQL enums)

### Полезные команды:

- **Генерация миграций**: `npm run db:generate`
- **Применение миграций**: `npm run db:migrate`
- **Drizzle Studio (веб-интерфейс к БД)**: `npm run db:studio` (откроется на `https://local.drizzle.studio`)

---

## 🐳 Запуск через Docker (Nginx + SSL)

В проекте настроена среда с Nginx reverse proxy и автоматической генерацией SSL-сертификатов через утилиту `scripts/setup-certs.ts`:

- Запуск полного стека (PostgreSQL + SvelteKit App + Nginx SSL):
  ```bash
  npm run docker:up
  ```
- Запуск с пересборкой образов:
  ```bash
  npm run docker:build
  ```
- Сброс и повторная генерация сертификатов:
  ```bash
  npm run certs:reset
  ```
- Остановка контейнеров:
  ```bash
  npm run docker:down
  ```

Приложение будет доступно по защищенному протоколу HTTPS: [https://localhost](https://localhost).

---

## 📜 Доступные npm-скрипты

| Команда | Описание |
| :--- | :--- |
| `npm run dev` | Запуск сервера разработки Vite (`localhost:5173`) |
| `npm run build` | Сборка production-бандла (`build/`) |
| `npm run preview` | Локальный предпросмотр собранного production-бандла |
| `npm run check` | Проверка типов SvelteKit и TypeScript (`svelte-check`) |
| `npm run check:watch` | Проверка типов в режиме наблюдения (`watch`) |
| `npm run lint` | Проверка кода линтерами (Prettier + ESLint) |
| `npm run format` | Автоматическое форматирование всех файлов (Prettier) |
| `npm test` | Однократный запуск всех тестов Vitest (`server` + `client`) |
| `npm run test:unit` | Запуск Vitest в интерактивном режиме |
| `npm run db:start` | Запуск сервиса базы данных в Docker Compose и применение миграций |
| `npm run db:generate` | Генерация файлов миграций на основе схемы |
| `npm run db:migrate` | Применение сгенерированных миграций |
| `npm run db:studio` | Запуск визуального менеджера данных Drizzle Studio |
| `npm run docker:up` | Генерация SSL и запуск всех сервисов в Docker |
| `npm run docker:build`| Пересборка и запуск Docker с генерацией SSL |
| `npm run docker:down` | Остановка Docker Compose |
| `npm run certs:reset` | Удаление старых SSL-сертификатов |

---

## 📐 Стандарты и конвенции кода

В проекте настроены строгие правила ESLint и TypeScript. Нарушение правил приведет к ошибкам в `npm run lint` и падению проверок.

### TypeScript

1. **Используйте `type` вместо `interface`**:
   Правило `@typescript-eslint/consistent-type-definitions` настроено на `type`.
   ```ts
   // ✅ Правильно:
   export type UserProfile = {
     id: string;
     name: string;
   };

   // ❌ Неправильно:
   export interface UserProfile {
     id: string;
     name: string;
   }
   ```

2. **Импорт типов только через `import type`**:
   ```ts
   // ✅ Правильно:
   import type { RequestEvent } from "@sveltejs/kit";

   // ❌ Неправильно:
   import { RequestEvent } from "@sveltejs/kit";
   ```

3. **Явные типы возвращаемых значений функций**:
   Все экспортируемые и верхнеуровневые функции должны явно декларировать тип возвращаемого значения:
   ```ts
   // ✅ Правильно:
   export function formatUserName(firstName: string, lastName: string): string {
     return `${firstName} ${lastName}`;
   }
   ```

4. **Алиасы путей**:
   Используйте `#lib` для импорта библиотечного кода:
   - `#lib/...` или `$lib/...` вместо длинных относительных путей `../../lib/...`.

---

### Svelte 5 (Runes)

Проект работает на **Svelte 5** с принудительно включенным режимом рун (`runes: true`).

1. **Только руны**:
   Не используйте легаси-синтаксис Svelte 3/4 (`let count = 0; $: doubled = count * 2;`, `export let prop;`).
   - Реактивное состояние: `$state(...)`
   - Вычисляемые значения: `$derived(...)` (предпочтительнее, чем `$derived.by(...)`)
   - Входные параметры (props): `$props()`
   - Побочные эффекты: `$effect(...)`

2. **TypeScript в скриптах**:
   Каждый компонент должен содержать `<script lang="ts">`.

3. **Никаких инлайн-стилей**:
   Запрещен атрибут `style="..."`. Используйте утилитные классы Tailwind CSS.

4. **Именование обработчиков событий**:
   Свойства для обработки событий должны начинаться с `on` (например, `onclick`, `onchange`, `onsubmit`).

5. **Сортировка атрибутов**:
   Плагин ESLint требует соблюдения порядка атрибутов в разметке Svelte.

---

### Стилизация (Tailwind CSS v4)

- Используется Tailwind CSS v4 с подключением через плагин `@tailwindcss/vite` и файл стилей `src/routes/layout.css`.
- Порядок классов форматируется автоматически при помощи `prettier-plugin-tailwindcss`.

---

## 🧪 Тестирование

Тесты разделены на два проекта в `vite.config.ts`:
1. **`server`**: юнит-тесты серверной логики и утилит (`src/**/*.{test,spec}.{js,ts}`).
2. **`client`**: компонентные тесты в реальном браузере Chromium через Playwright (`src/**/*.svelte.{test,spec}.{js,ts}`).

- Запуск всех тестов:
  ```bash
  npm test
  ```
- Для добавления нового теста компонента создавайте файл с расширением `.svelte.spec.ts` рядом с компонентом (пример см. в `src/lib/vitest-examples/Welcome.svelte.spec.ts`).
- Для утилит используйте `.spec.ts` (пример см. в `src/lib/vitest-examples/greet.spec.ts`).

---

## 🔀 Git Workflow и правила коммитов

### Ветвление

- `main` — защищенная ветка для стабильного кода.
- Для любой задачи создавайте отдельную ветку от актуального `main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b <тип>/<краткое-описание>
  ```

### Префиксы веток:
- `feature/` — добавление новой функциональности (например, `feature/user-avatar-upload`)
- `fix/` — исправление бага (например, `fix/auth-session-cookie`)
- `refactor/` — рефакторинг без изменения функционала
- `test/` — добавление или правка тестов
- `docs/` — обновление документации
- `chore/` — обновление зависимостей, конфигов или скриптов сборки

### Сообщения коммитов (Conventional Commits)

Мы придерживаемся формата [Conventional Commits](https://www.conventionalcommits.org/):

```
<тип>(<область>): <краткое описание в повелительном наклонении>

[опциональное подробное описание]
```

**Примеры**:
- `feat(auth): add password reset functionality`
- `fix(db): resolve unique constraint issue on user email`
- `docs: update CONTRIBUTING with playwright setup instructions`
- `refactor(ui): extract Navbar into separate component`

---

## ✅ Чеклист перед отправкой PR

Перед тем как создать Pull Request или передать ветку на код-ревью, обязательно выполните:

```bash
# 1. Проверка типов TypeScript и Svelte
npm run check

# 2. Проверка стилей и линтинг
npm run lint

# 3. Автоисправление форматирования (если есть ошибки Prettier)
npm run format

# 4. Прогон тестов
npm test
```

### В Pull Request:
1. Укажите понятный заголовок и краткое описание сути изменений.
2. Прикрепите ссылку на соответствующую задачу (Issue).
3. При изменении UI приложите скриншоты или GIF с демонстрацией работы.
4. Убедитесь, что все автоматические проверки (CI) завершились успешно.
5. Получите одобрение минимум одного коллеги (Approve).
