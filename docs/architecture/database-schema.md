# **Раздел 8: Схема базы данных (SQL DDL)**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.users (  
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  
  email TEXT UNIQUE NOT NULL,  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL  
);

CREATE TABLE public.chats (  
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  
  title TEXT NOT NULL,  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL  
);  
CREATE INDEX ON public.chats (user_id);

CREATE TYPE public.message_role AS ENUM ('user', 'assistant');

CREATE TABLE public.messages (  
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,  
  role message_role NOT NULL,  
  content TEXT NOT NULL,  
  source_email_ids UUID[],  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL  
);  
CREATE INDEX ON public.messages (chat_id);

CREATE TABLE public.emails (  
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  
  google_message_id TEXT NOT NULL,  
  subject TEXT,  
  sent_at TIMESTAMPTZ,  
  body_text TEXT,  
  embedding VECTOR(1536),  
  metadata JSONB,  
  is_filtered BOOLEAN DEFAULT FALSE,
  filter_reason TEXT,
  processed_at TIMESTAMPTZ,
  text_chunks JSONB,
  vectorized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,  
  UNIQUE (user_id, google_message_id)  
);  
CREATE INDEX ON public.emails (user_id);  
CREATE INDEX ON public.emails USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON public.emails (is_filtered);
CREATE INDEX ON public.emails (vectorized_at);

CREATE TABLE public.participants (  
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  
  email TEXT NOT NULL,  
  name TEXT,  
  UNIQUE (user_id, email)  
);

CREATE TABLE public.email_participants (  
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,  
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,  
  role TEXT NOT NULL, -- 'from', 'to', 'cc'  
  PRIMARY KEY (email_id, participant_id, role)  
);  
CREATE INDEX ON public.email_participants (participant_id);

-- Filter configuration table
CREATE TABLE public.filter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain_pattern TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('blacklist', 'whitelist')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, domain_pattern)
);

CREATE INDEX ON public.filter_config (user_id);

-- Attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  content_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX ON public.attachments (email_id);
CREATE INDEX ON public.attachments (mime_type);
``` 