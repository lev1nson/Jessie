# **Jessie Email Assistant Fullstack Architecture Document**

### **Раздел 1: Высокоуровневая архитектура**

#### **Техническое резюме**

Проект "Jessie" будет реализован как современное full-stack приложение на стеке Vercel \+ Supabase. Архитектура состоит из frontend на Next.js (с TypeScript), развернутого на Vercel, и backend в виде бессерверных функций на TypeScript. Данные и векторы будут храниться в PostgreSQL с расширением pgvector от Supabase. Проект будет организован в виде монорепозитория.

#### **Выбор платформы и инфраструктуры**

* **Рекомендация**: **Vercel \+ Supabase.**  
* **Обоснование**: Скорость разработки, отличная интеграция, экономическая эффективность для MVP и хорошая масштабируемость.

#### **Структура репозитория**

* **Решение**: **Monorepo**.

#### **Диаграмма высокоуровневой архитектуры**

Code snippet

graph TD  
    subgraph User  
        U\[Пользователь\]  
    end  
    subgraph Vercel Platform  
        F\[Frontend: Next.js App\]  
        API\[Backend: Serverless API\]  
        Cron\[Cron Job: Email Sync\]  
    end  
    subgraph Supabase Platform  
        Auth\[Supabase Auth\]  
        DB\[Database: Postgres \+ pgvector\]  
    end  
    subgraph External  
        GAPI\[Google Gmail API\]  
    end  
    U \--\> F; F \--\> API; F \--\> Auth; API \--\> DB; Cron \--\> GAPI; Cron \--\> DB;

#### **Архитектурные паттерны**

* **Jamstack**: Быстрый frontend с динамикой через API.  
* **Serverless Functions**: Вся логика backend в бессерверных функциях.  
* **Repository Pattern**: Абстрагирование логики работы с базой данных.

### **Раздел 2: Технологический стек**

| Категория | Технология | Версия | Назначение |
| :---- | :---- | :---- | :---- |
| **Язык** | TypeScript | \~5.4 | Единый язык для Frontend и Backend |
| **Frontend Framework** | Next.js | \~14.2 | Основа веб\-приложения (React) |
| **UI Компоненты** | shadcn/ui | \~0.8 | Библиотека UI компонентов |
| **Стилизация** | Tailwind CSS | \~3.4 | CSS фреймворк |
| **Управление состоянием** | Zustand | \~4.5 | State Manager для Frontend |
| **Backend Framework** | Next.js API Routes | \~14.2 | Реализация бессерверного API |
| **База данных** | PostgreSQL | 15.x | Основная реляционная база данных |
| **Векторное хранилище** | pgvector | \~0.7 | Расширение для векторного поиска |
| **Аутентификация** | Supabase Auth | \~2.43 | Управление пользователями и доступом |
| **Хранилище файлов** | Supabase Storage | \~2.8 | Хранение обработанных вложений |
| **Тестирование (Unit/Int)** | Vitest | \~1.6 | Тестирование кода |
| **Тестирование (E2E)** | Playwright | \~1.44 | Сквозное тестирование интерфейса |
| **CI/CD** | Vercel CI/CD | \- | Сборка и развертывание проекта |
| **Мониторинг** | Vercel Analytics | \- | Аналитика использования |
| **Логирование** | Vercel Log Drains | \- | Сбор логов бессерверных функций |

### **Раздел 3: Модели данных**

*(Определены TypeScript-интерфейсы и SQL-схема для users, chats, messages, emails, participants, email\_participants)*

### **Раздел 4: Спецификация API (OpenAPI 3.0)**

* **Эндпоинты**:  
  * POST /chats: Создать новый чат.  
  * GET /chats: Получить список чатов.  
  * GET /chats/{chatId}/messages: Получить сообщения чата.  
  * POST /chats/{chatId}/messages: Отправить новое сообщение.

### **Раздел 5: Компоненты**

* **Frontend Application (Jessie UI)**: Пользовательский интерфейс.  
* **Backend API**: Обработка запросов от UI.  
* **Data Ingestion Pipeline**: Фоновый сбор и обработка писем.  
* **LLM Service**: Централизованный мост к моделям (OpenAI/Anthropic) для создания векторов и генерации ответов.

### **Раздел 6: Внешние API**

* **Google Gmail API**: Для чтения писем.  
* **LLM Provider API (например, OpenAI)**: Для векторизации и генерации ответов.

### **Раздел 7: Ключевые рабочие процессы**

* **Процесс 1: Фоновый сбор и индексация писем**  
  Code snippet  
  sequenceDiagram  
      participant Cron as Vercel Cron Job  
      participant Ingestion as Data Ingestion Pipeline  
      participant Gmail as Google Gmail API  
      participant LLM as LLM Service  
      participant DB as Supabase DB  
      Cron-\>\>+Ingestion: Активировать  
      Ingestion-\>\>+Gmail: Запросить новые письма  
      Gmail--\>\>-Ingestion: Вернуть письма  
      loop Для каждого письма  
          Ingestion-\>\>+LLM: Сгенерировать embedding  
          LLM--\>\>-Ingestion: Вернуть вектор  
          Ingestion-\>\>+DB: Сохранить письмо и вектор  
          DB--\>\>-Ingestion: Подтвердить  
      end

* **Процесс 2: Запрос пользователя и генерация ответа (оптимизированный)**  
  Code snippet  
  sequenceDiagram  
      participant User as Пользователь  
      participant Frontend as Frontend App  
      participant API as Backend API  
      participant LLM as LLM Service  
      participant DB as Supabase DB  
      User-\>\>+Frontend: Вводит вопрос  
      Frontend-\>\>+API: POST /api/chats/...  
      API-\>\>+DB: Найти похожие векторы (передает сырой текст)  
      DB--\>\>-API: Вернуть релевантные тексты  
      API-\>\>+LLM: Сгенерировать ответ (вопрос \+ тексты)  
      LLM--\>\>-API: Вернуть ответ  
      API--\>\>-Frontend: Вернуть ответ  
      Frontend--\>\>-User: Показать ответ

### **Раздел 8: Схема базы данных (SQL DDL)**

SQL

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.users (  
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  
  email TEXT UNIQUE NOT NULL,  
  created\_at TIMESTAMPTZ DEFAULT now() NOT NULL  
);

CREATE TABLE public.chats (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  
  title TEXT NOT NULL,  
  created\_at TIMESTAMPTZ DEFAULT now() NOT NULL  
);  
CREATE INDEX ON public.chats (user\_id);

CREATE TYPE public.message\_role AS ENUM ('user', 'assistant');

CREATE TABLE public.messages (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  chat\_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,  
  role message\_role NOT NULL,  
  content TEXT NOT NULL,  
  source\_email\_ids UUID\[\],  
  created\_at TIMESTAMPTZ DEFAULT now() NOT NULL  
);  
CREATE INDEX ON public.messages (chat\_id);

CREATE TABLE public.emails (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  
  google\_message\_id TEXT NOT NULL,  
  subject TEXT,  
  sent\_at TIMESTAMPTZ,  
  body\_text TEXT,  
  embedding VECTOR(1536),  
  metadata JSONB,  
  created\_at TIMESTAMPTZ DEFAULT now() NOT NULL,  
  UNIQUE (user\_id, google\_message\_id)  
);  
CREATE INDEX ON public.emails (user\_id);  
CREATE INDEX ON public.emails USING hnsw (embedding vector\_cosine\_ops);

CREATE TABLE public.participants (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  
  email TEXT NOT NULL,  
  name TEXT,  
  UNIQUE (user\_id, email)  
);

CREATE TABLE public.email\_participants (  
  email\_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,  
  participant\_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,  
  role TEXT NOT NULL, \-- 'from', 'to', 'cc'  
  PRIMARY KEY (email\_id, participant\_id, role)  
);  
CREATE INDEX ON public.email\_participants (participant\_id);

### **Раздел 9: Архитектура бэкенда**

* **Паттерны**: Dependency Injection, Repository Pattern, файловая структура для API-маршрутов.  
* **Аутентификация**: Поток с использованием JWT от Supabase, который проверяется в middleware.

### **Раздел 10: Единая структура проекта**

Эта структура оптимизирована для нашего стека (Next.js, Vercel, Supabase) и использует стандартный подход apps / packages для организации монорепозитория.

Plaintext

jessie-email-assistant/  
├── apps/  
│   ├── web/                      \# Основное Next.js приложение (Frontend \+ Backend API)  
│   │   ├── app/  
│   │   │   ├── (chat)/             \# Группа маршрутов для основного интерфейса  
│   │   │   │   ├── chat/  
│   │   │   │   │   └── \[chatId\]/  
│   │   │   │   │       └── page.tsx  
│   │   │   │   └── layout.tsx        \# Основной макет чата  
│   │   │   ├── api/                  \# Наши Backend API Routes  
│   │   │   │   ├── chats/  
│   │   │   │   │   └── ...  
│   │   │   │   └── ingest/  
│   │   │   ├── auth/                 \# Маршруты для аутентификации  
│   │   │   └── layout.tsx            \# Корневой макет  
│   │   ├── components/  
│   │   │   ├── features/             \# Компоненты с бизнес-логикой  
│   │   │   └── ui/                   \# Компоненты из shadcn/ui  
│   │   ├── lib/                    \# Клиентские утилиты  
│   │   └── ...                     \# Конфигурационные файлы Next.js  
│   │  
│   └── db/                       \# Конфигурация и миграции для Supabase  
│       └── migrations/  
│  
├── packages/  
│   ├── ui/                       \# Общая UI-библиотека (если понадобится)  
│   ├── config/                   \# Общие конфигурации (ESLint, TypeScript)  
│   └── lib/                      \# Общий код для всего проекта  
│       ├── supabaseClient.ts     \# Клиент Supabase  
│       └── types.ts              \# Наши TypeScript-интерфейсы  
│  
├── .env.example                  \# Пример файла с переменными окружения  
├── package.json                  \# Корневой package.json  
└── turbo.json                    \# Конфигурация Turborepo (для управления монорепо)

---

### **Раздел 11: Рабочий процесс разработки**

#### **Локальная настройка (Local Development Setup)**

* **Предварительные требования (Prerequisites)**:  
  * Node.js (\~20.x)  
  * pnpm (npm install \-g pnpm)  
  * Docker  
  * Supabase CLI (npm install \-g supabase)  
* **Первоначальная настройка (Initial Setup)**:  
  Bash  
  \# 1\. Клонировать репозиторий  
  git clone \<repository\_url\>  
  cd jessie-email-assistant

  \# 2\. Установить все зависимости  
  pnpm install

  \# 3\. Инициализировать локальную среду Supabase  
  cd apps/db  
  supabase init

  \# 4\. Запустить Supabase (база данных в Docker)  
  supabase start

  \# 5\. Создать файл с переменными окружения  
  cd ../..   
  cp .env.example .env   
  \# После этого скопировать ключи и пароль из вывода команды 'supabase start' в файл .env

* **Команды для разработки (Development Commands)**:  
  Bash  
  \# Запустить веб\-приложение в режиме разработки  
  pnpm dev

  \# Запустить все тесты в проекте  
  pnpm test

#### **Конфигурация окружения (.env.example)**

* **Необходимые переменные окружения**:  
  Bash  
  \# Public переменные для Frontend (Next.js)  
  NEXT\_PUBLIC\_SUPABASE\_URL="http://127.0.0.1:54321"  
  NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY="\<your\_local\_anon\_key\>"

  \# Secret переменные для Backend (API Routes)  
  SUPABASE\_SERVICE\_ROLE\_KEY="\<your\_local\_service\_role\_key\>"

  \# Секреты для внешних сервисов  
  GOOGLE\_CLIENT\_ID="\<your\_google\_client\_id\>"  
  GOOGLE\_CLIENT\_SECRET="\<your\_google\_client\_secret\>"  
  OPENAI\_API\_KEY="\<your\_openai\_api\_key\>" \# или ключ другого LLM

---

### **Раздел 12: Архитектура развертывания**

#### **Стратегия развертывания (Deployment Strategy)**

Мы будем использовать **Git-flow** — развертывание происходит автоматически на основе действий в Git-репозитории. Frontend и Backend развертываются одновременно через Vercel.

#### **CI/CD Пайплайн (CI/CD Pipeline)**

Процесс полностью управляется Vercel:

1. **Push в ветку**: Vercel автоматически создает "Preview-развертывание".  
2. **Создание Pull Request в main**: На Preview-развертывании запускаются тесты.  
3. **Слияние с main**: Vercel автоматически собирает и развертывает продакшен-версию.  
   YAML  
   \# Пример CI/CD пайплайна  
   \- on: push(branch: feature-branch)  
     action: Deploy to Preview URL  
   \- on: pull\_request(to: main)  
     action: Run Tests on Preview URL  
   \- on: merge(branch: main)  
     action: Deploy to Production

#### **Окружения (Environments)**

| Окружение | URL (Пример) | Назначение |
| :---- | :---- | :---- |
| **Development** | http://localhost:3000 | Локальная разработка и тестирование. |
| **Staging/Preview** | jessie-pr-123.vercel.app | Ревью и тесты для каждого Pull Request. |
| **Production** | jessie.vercel.app | "Живое" приложение. |

---

### **Раздел 13: Безопасность и производительность**

#### **Требования к безопасности (Security Requirements)**

* **Безопасность Frontend**:  
  * Реализация строгой **Политики безопасности контента (CSP)** для предотвращения XSS-атак.  
  * **Санитизация** всего контента из писем перед отображением.  
* **Безопасность Backend**:  
  * **Валидация** всех входящих данных на API-маршрутах с помощью **Zod**.  
  * Включение встроенных в Supabase **ограничений по частоте запросов (rate limiting)**.  
  * Настройка **CORS** для приема запросов только с нашего домена на Vercel.  
* **Безопасность аутентификации**:  
  * Использование **защищенных, HttpOnly куки** от Supabase Auth.  
  * Хранение всех "секретов" в **зашифрованных переменных окружения** Vercel.

#### **Оптимизация производительности (Performance Optimization)**

* **Производительность Frontend**:  
  * Автоматическое **разделение кода (code-splitting)** от Next.js.  
  * Использование **динамических импортов** для "тяжелых" компонентов.  
  * Оптимизация изображений через встроенный сервис Vercel.  
* **Производительность Backend**:  
  * Использование **индекса HNSW** в pgvector для быстрого семантического поиска.  
  * Добавление стандартных **индексов PostgreSQL** на внешние ключи.

---

### **Раздел 14: Стратегия тестирования**

#### **Пирамида тестирования (Testing Pyramid)**

Plaintext

      /|\\  
     / | \\    \<-- E2E Тесты (Playwright) \- мало  
    /--|--\\  
   /   |   \\  \<-- Интеграционные тесты (Vitest) \- среднее  
  /----|----\\  
 /     |     \\\<-- Unit Тесты (Vitest) \- много  
/\_\_\_\_\_\_|\_\_\_\_\_\_\\

#### **Организация тестов (Test Organization)**

* **Frontend-тесты**: Находятся рядом с компонентами (Component.test.tsx), используют **Vitest** и **React Testing Library**.  
* **Backend-тесты**: Находятся в папке \_\_tests\_\_ рядом с API-маршрутами, используют **Vitest**.  
* **E2E-тесты**: Находятся в отдельной папке e2e в корне проекта, используют **Playwright**.

#### **Примеры тестов (Test Examples)**

* **Пример Frontend Unit-теста**:  
  TypeScript  
  it('should render the button with correct text', () \=\> {  
    render(\<Button\>Click me\</Button\>);  
    expect(screen.getByText('Click me')).toBeInTheDocument();  
  });

* **Пример Backend-теста**:  
  TypeScript  
  it('should return 401 if user is not authenticated', async () \=\> {  
    vi.spyOn(ChatRepository, 'getChatsByUserId').mockResolvedValue(\[\]);  
    const response \= await GET(mockRequest);  
    expect(response.status).toBe(401);  
  });

* **Пример E2E-теста**:  
  TypeScript  
  test('should allow a user to log in', async ({ page }) \=\> {  
    await page.goto('/');  
    await page.click('button:text("Войти через Google")');  
    await expect(page.locator('h1')).toHaveText('Welcome, user\!');  
  });

---

### **Раздел 15: Стандарты кодирования**

#### **Критические правила (Critical Rules)**

1. **ИСПОЛЬЗОВАТЬ DI-КОНТЕЙНЕР**: Все сервисы и репозитории запрашивать из центрального DI-контейнера.  
2. **ИСПОЛЬЗОВАТЬ РЕПОЗИТОРИИ**: Все взаимодействия с БД должны идти через классы-репозитории.  
3. **СТРОГАЯ ТИПИЗАЦИЯ**: Все общие структуры данных должны использовать типы из packages/lib/types.ts.  
4. **ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ**: Доступ к секретам — только через специальный конфигурационный модуль.  
5. **ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ**: Все данные в API-маршрутах должны быть проверены схемой Zod.  
6. **ИСПОЛЬЗОВАТЬ API-КЛИЕНТ**: Все вызовы API с frontend должны использовать централизованный API-клиент.

#### **Соглашения об именовании (Naming Conventions)**

| Элемент | Соглашение | Пример |
| :---- | :---- | :---- |
| **Компоненты (React)** | PascalCase | UserProfile.tsx |
| **Хуки (React)** | useCamelCase | useAuth.ts |
| **Таблицы/колонки БД** | snake\_case | user\_profiles, created\_at |
| **TypeScript Interfaces** | PascalCase | interface UserProfile |

