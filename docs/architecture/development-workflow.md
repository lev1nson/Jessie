# **Раздел 11: Рабочий процесс разработки**

## **Локальная настройка (Local Development Setup)**

* **Предварительные требования (Prerequisites)**:  
  * Node.js (~20.x)  
  * pnpm (npm install -g pnpm)  
  * Docker  
  * Supabase CLI (npm install -g supabase)  
* **Первоначальная настройка (Initial Setup)**:  
```bash
# 1. Клонировать репозиторий  
git clone <repository_url>  
cd jessie-email-assistant

# 2. Установить все зависимости  
pnpm install

# 3. Инициализировать локальную среду Supabase  
cd apps/db  
supabase init

# 4. Запустить Supabase (база данных в Docker)  
supabase start

# 5. Создать файл с переменными окружения  
cd ../..   
cp .env.example .env   
# После этого скопировать ключи и пароль из вывода команды 'supabase start' в файл .env
```

* **Команды для разработки (Development Commands)**:  
```bash
# Запустить веб-приложение в режиме разработки  
pnpm dev

# Запустить все тесты в проекте  
pnpm test
```

## **Конфигурация окружения (.env.example)**

* **Необходимые переменные окружения**:  
```bash
# Public переменные для Frontend (Next.js)  
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"  
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your_local_anon_key>"

# Secret переменные для Backend (API Routes)  
SUPABASE_SERVICE_ROLE_KEY="<your_local_service_role_key>"

# Секреты для внешних сервисов  
GOOGLE_CLIENT_ID="<your_google_client_id>"  
GOOGLE_CLIENT_SECRET="<your_google_client_secret>"  
OPENAI_API_KEY="<your_openai_api_key>" # или ключ другого LLM
``` 