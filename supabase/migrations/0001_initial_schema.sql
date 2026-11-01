-- =============================================================================
-- PLATAFORMA WEB PREMIUM — FERNANDA CAETANO
-- Migration 0001: Esquema Relacional Completo (PostgreSQL / Supabase)
-- Fuso Horário de Referência da Aplicação: America/Sao_Paulo
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ADMIN PROFILES
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  professional_title TEXT NOT NULL,
  registration_number TEXT,
  whatsapp_phone TEXT,
  receive_whatsapp_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SITE SETTINGS & SECTIONS (Rascunho e Publicado)
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  professional_name TEXT NOT NULL,
  professional_subtitle TEXT NOT NULL,
  professional_bio TEXT NOT NULL,
  hero_badge TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  instagram_url TEXT NOT NULL,
  instagram_handle TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#07152B',
  accent_color TEXT NOT NULL DEFAULT '#D97732',
  background_color TEXT NOT NULL DEFAULT '#F7F5F1',
  gold_color TEXT NOT NULL DEFAULT '#C5A46D',
  booking_mode TEXT NOT NULL DEFAULT 'automatic', -- 'automatic' | 'approval'
  online_booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  min_advance_hours INTEGER NOT NULL DEFAULT 2,
  max_advance_days INTEGER NOT NULL DEFAULT 60,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  booking_success_message TEXT NOT NULL,
  privacy_policy_text TEXT NOT NULL,
  about_full_text TEXT NOT NULL,
  about_highlights_json TEXT NOT NULL DEFAULT '[]',
  draft_json TEXT, -- Armazena prévia não publicada do editor
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_sections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CUSTOM LINKS (Botões Dinâmicos Estilo Linktree Premium)
CREATE TABLE IF NOT EXISTS custom_links (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Calendar',
  destination_type TEXT NOT NULL, -- 'booking' | 'procedure' | 'unit' | 'whatsapp' | 'internal_page' | 'external_link' | 'section'
  destination_value TEXT NOT NULL,
  whatsapp_message TEXT,
  style_variant TEXT NOT NULL DEFAULT 'default', -- 'primary_cta' | 'navy' | 'default' | 'outline_gold'
  badge_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. UNITS (Unidades de Atendimento)
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  address_line TEXT NOT NULL,
  neighborhood_city TEXT NOT NULL,
  maps_url TEXT,
  whatsapp_phone TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'presencial', -- 'presencial' | 'domiciliar'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo_data BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PROCEDURE CATEGORIES & PROCEDURES
CREATE TABLE IF NOT EXISTS procedure_categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category_id TEXT NOT NULL REFERENCES procedure_categories(id),
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  image_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
  price_cents INTEGER,
  show_price BOOLEAN NOT NULL DEFAULT FALSE,
  modality TEXT NOT NULL DEFAULT 'presencial', -- 'presencial' | 'domiciliar'
  preparation_instructions TEXT,
  online_booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procedure_units (
  procedure_id TEXT NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  PRIMARY KEY (procedure_id, unit_id)
);

-- 6. CLIENTS (Gerenciamento de Relacionamento sem Prontuário Clínico)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  whatsapp_phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  lgpd_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(whatsapp_phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(full_name);

-- 7. APPOINTMENTS (Agendamentos com Preservação Histórica)
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  booking_code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  procedure_id TEXT NOT NULL REFERENCES procedures(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  -- Snapshots históricos
  client_name_snapshot TEXT NOT NULL,
  client_phone_snapshot TEXT NOT NULL,
  client_email_snapshot TEXT,
  procedure_name_snapshot TEXT NOT NULL,
  unit_name_snapshot TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
  price_cents_snapshot INTEGER,
  -- Data e Horário (America/Sao_Paulo)
  appointment_date TEXT NOT NULL, -- YYYY-MM-DD
  shift TEXT NOT NULL, -- 'morning' | 'afternoon' | 'evening'
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM (inclui duração do atendimento)
  occupied_until_time TEXT NOT NULL, -- HH:MM (inclui buffer pós-atendimento)
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  source TEXT NOT NULL DEFAULT 'online', -- 'online' | 'admin_manual'
  client_notes TEXT,
  admin_notes TEXT,
  home_care_address TEXT,
  whatsapp_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);

-- 8. WORKING HOURS, EXCEPTIONS & SCHEDULE BLOCKS
CREATE TABLE IF NOT EXISTS working_hours (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 (Dom) a 6 (Sáb)
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  shifts_json TEXT NOT NULL DEFAULT '[]', -- Ex: [{"start":"08:00","end":"12:00"},{"start":"13:30","end":"18:00"}]
  UNIQUE(unit_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id TEXT PRIMARY KEY,
  exception_date TEXT NOT NULL, -- YYYY-MM-DD
  unit_id TEXT REFERENCES units(id) ON DELETE CASCADE, -- NULL = todas as unidades
  exception_type TEXT NOT NULL, -- 'holiday' | 'vacation' | 'day_off' | 'custom_hours'
  title TEXT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT TRUE,
  custom_shifts_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id TEXT PRIMARY KEY,
  block_date TEXT NOT NULL, -- YYYY-MM-DD
  unit_id TEXT REFERENCES units(id) ON DELETE CASCADE, -- NULL = bloqueia agenda global da Fernanda
  is_full_day BOOLEAN NOT NULL DEFAULT FALSE,
  start_time TEXT, -- HH:MM
  end_time TEXT, -- HH:MM
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks(block_date);

-- 9. NOTIFICATIONS, AUDIT LOGS & WHATSAPP BOT
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  appointment_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_bot_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected' | 'qr_ready' | 'authenticated' | 'connected'
  qr_code_data TEXT,
  connected_phone TEXT,
  connected_name TEXT,
  auto_confirm_msg_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_2h_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_professional_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  professional_phone TEXT NOT NULL,
  template_client_booking TEXT NOT NULL,
  template_client_reminder TEXT NOT NULL,
  template_professional_alert TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  recipient_type TEXT NOT NULL, -- 'client' | 'professional' | 'test'
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'booking_created' | 'booking_confirmed' | 'reminder_2h' | 'manual_test'
  message_content TEXT NOT NULL,
  delivery_mode TEXT NOT NULL, -- 'baileys_live' | 'queued_ready'
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Políticas RLS de Referência para Supabase
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

