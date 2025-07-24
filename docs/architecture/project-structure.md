# **Раздел 10: Единая структура проекта**

Эта структура оптимизирована для нашего стека (Next.js, Vercel, Supabase) и использует стандартный подход apps / packages для организации монорепозитория.

```
jessie-email-assistant/  
├── apps/  
│   ├── web/                      # Основное Next.js приложение (Frontend + Backend API)  
│   │   ├── app/  
│   │   │   ├── (chat)/             # Группа маршрутов для основного интерфейса  
│   │   │   │   ├── chat/  
│   │   │   │   │   └── [chatId]/  
│   │   │   │   │       └── page.tsx  
│   │   │   │   └── layout.tsx        # Основной макет чата  
│   │   │   ├── api/                  # Наши Backend API Routes  
│   │   │   │   ├── chats/  
│   │   │   │   │   └── ...  
│   │   │   │   └── ingest/  
│   │   │   ├── auth/                 # Маршруты для аутентификации  
│   │   │   └── layout.tsx            # Корневой макет  
│   │   ├── components/  
│   │   │   ├── features/             # Компоненты с бизнес-логикой  
│   │   │   └── ui/                   # Компоненты из shadcn/ui  
│   │   ├── lib/                    # Клиентские утилиты  
│   │   └── ...                     # Конфигурационные файлы Next.js  
│   │  
│   └── db/                       # Конфигурация и миграции для Supabase  
│       └── migrations/  
│  
├── packages/  
│   ├── ui/                       # Общая UI-библиотека (если понадобится)  
│   ├── config/                   # Общие конфигурации (ESLint, TypeScript)  
│   └── lib/                      # Общий код для всего проекта  
│       ├── supabaseClient.ts     # Клиент Supabase  
│       └── types.ts              # Наши TypeScript-интерфейсы  
│  
├── .env.example                  # Пример файла с переменными окружения  
├── package.json                  # Корневой package.json  
└── turbo.json                    # Конфигурация Turborepo (для управления монорепо) 