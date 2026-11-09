import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const IS_VERCEL = Boolean(process.env.VERCEL);
const DB_DIR = IS_VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "fernanda_caetano.sqlite");

export interface AppDatabase {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (...params: any[]) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all: (...params: any[]) => any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: (...params: any[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
  };
  transaction: <TInput, TResult>(
    fn: (input: TInput) => TResult
  ) => {
    (input: TInput): TResult;
    immediate: (input: TInput) => TResult;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __fernandaDb: AppDatabase | undefined;
  // eslint-disable-next-line no-var
  var __fernandaSchemaV2: boolean | undefined;
}

export function hashPassword(password: string): string {
  const salt = "fernanda_caetano_salt_2026";
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hash, "hex")
    );
  } catch {
    return false;
  }
}

function toPlain<T>(val: T): T {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) {
    return val.map((item) => toPlain(item)) as unknown as T;
  }
  return { ...(val as Record<string, unknown>) } as T;
}

export function getDb(): AppDatabase {
  if (global.__fernandaDb) {
    if (!global.__fernandaSchemaV2) {
      initSchemaAndSeed(global.__fernandaDb);
      global.__fernandaSchemaV2 = true;
    }
    return global.__fernandaDb;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const rawDb = new DatabaseSync(DB_PATH);
  rawDb.exec("PRAGMA journal_mode = WAL;");
  rawDb.exec("PRAGMA foreign_keys = ON;");

  const wrappedDb: AppDatabase = {
    exec: (sql: string) => rawDb.exec(sql),
    prepare: (sql: string) => {
      const stmt = rawDb.prepare(sql);
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: (...params: any[]) => toPlain(stmt.get(...params)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all: (...params: any[]) => toPlain(stmt.all(...params)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        run: (...params: any[]) => stmt.run(...params),
      };
    },
    transaction: <TInput, TResult>(fn: (input: TInput) => TResult) => {
      const runner = (input: TInput): TResult => {
        rawDb.exec("BEGIN");
        try {
          const res = fn(input);
          rawDb.exec("COMMIT");
          return res;
        } catch (err) {
          try {
            rawDb.exec("ROLLBACK");
          } catch {
            // ignore rollback error
          }
          throw err;
        }
      };
      runner.immediate = (input: TInput): TResult => {
        rawDb.exec("BEGIN IMMEDIATE");
        try {
          const res = fn(input);
          rawDb.exec("COMMIT");
          return res;
        } catch (err) {
          try {
            rawDb.exec("ROLLBACK");
          } catch {
            // ignore rollback error
          }
          throw err;
        }
      };
      return runner;
    },
  };

  initSchemaAndSeed(wrappedDb);
  global.__fernandaDb = wrappedDb;
  return wrappedDb;
}

function initSchemaAndSeed(db: AppDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      professional_title TEXT NOT NULL,
      registration_number TEXT,
      whatsapp_phone TEXT,
      receive_whatsapp_alerts INTEGER NOT NULL DEFAULT 1,
      avatar_url TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
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
      booking_mode TEXT NOT NULL DEFAULT 'automatic',
      online_booking_enabled INTEGER NOT NULL DEFAULT 1,
      min_advance_hours INTEGER NOT NULL DEFAULT 1,
      max_advance_days INTEGER NOT NULL DEFAULT 60,
      slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
      booking_success_message TEXT NOT NULL,
      privacy_policy_text TEXT NOT NULL,
      about_full_text TEXT NOT NULL,
      about_highlights_json TEXT NOT NULL DEFAULT '[]',
      draft_json TEXT,
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_sections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      is_visible INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      icon_name TEXT NOT NULL DEFAULT 'Calendar',
      destination_type TEXT NOT NULL,
      destination_value TEXT NOT NULL,
      whatsapp_message TEXT,
      style_variant TEXT NOT NULL DEFAULT 'default',
      badge_text TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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
      modality TEXT NOT NULL DEFAULT 'presencial',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_demo_data INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS procedure_categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
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
      show_price INTEGER NOT NULL DEFAULT 0,
      modality TEXT NOT NULL DEFAULT 'presencial',
      preparation_instructions TEXT,
      online_booking_enabled INTEGER NOT NULL DEFAULT 1,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      is_visible_public INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS procedure_units (
      procedure_id TEXT NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
      unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      PRIMARY KEY (procedure_id, unit_id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      whatsapp_phone TEXT NOT NULL,
      email TEXT,
      notes TEXT,
      lgpd_consent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(whatsapp_phone);

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      booking_code TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL REFERENCES clients(id),
      procedure_id TEXT NOT NULL REFERENCES procedures(id),
      unit_id TEXT NOT NULL REFERENCES units(id),
      client_name_snapshot TEXT NOT NULL,
      client_phone_snapshot TEXT NOT NULL,
      client_email_snapshot TEXT,
      procedure_name_snapshot TEXT NOT NULL,
      unit_name_snapshot TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
      price_cents_snapshot INTEGER,
      appointment_date TEXT NOT NULL,
      shift TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      occupied_until_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      source TEXT NOT NULL DEFAULT 'online',
      client_notes TEXT,
      admin_notes TEXT,
      home_care_address TEXT,
      whatsapp_reminder_sent INTEGER NOT NULL DEFAULT 0,
      whatsapp_confirmation_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, status);

    CREATE TABLE IF NOT EXISTS working_hours (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      is_open INTEGER NOT NULL DEFAULT 1,
      shifts_json TEXT NOT NULL DEFAULT '[]',
      UNIQUE(unit_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS availability_exceptions (
      id TEXT PRIMARY KEY,
      exception_date TEXT NOT NULL,
      unit_id TEXT,
      exception_type TEXT NOT NULL,
      title TEXT NOT NULL,
      is_closed INTEGER NOT NULL DEFAULT 1,
      custom_shifts_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_blocks (
      id TEXT PRIMARY KEY,
      block_date TEXT NOT NULL,
      unit_id TEXT,
      is_full_day INTEGER NOT NULL DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      appointment_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_bot_config (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'disconnected',
      qr_code_data TEXT,
      connected_phone TEXT,
      connected_name TEXT,
      auto_confirm_msg_enabled INTEGER NOT NULL DEFAULT 1,
      reminder_2h_enabled INTEGER NOT NULL DEFAULT 1,
      notify_professional_enabled INTEGER NOT NULL DEFAULT 1,
      professional_phone TEXT NOT NULL,
      template_client_booking TEXT NOT NULL,
      template_client_reminder TEXT NOT NULL,
      template_professional_alert TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
      id TEXT PRIMARY KEY,
      appointment_id TEXT,
      recipient_type TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      message_type TEXT NOT NULL,
      message_content TEXT NOT NULL,
      delivery_mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      workload_hours TEXT NOT NULL DEFAULT '12h',
      price_display TEXT NOT NULL DEFAULT 'Sob consulta',
      whatsapp_interest_message TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      module_title TEXT NOT NULL DEFAULT 'Módulo 1 — Fundamentos',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      video_source_type TEXT NOT NULL DEFAULT 'local_file',
      video_url TEXT NOT NULL DEFAULT '',
      duration_label TEXT NOT NULL DEFAULT '15 min',
      attachment_url TEXT NOT NULL DEFAULT '',
      attachment_label TEXT NOT NULL DEFAULT '',
      is_free_preview INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_students (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      password_plain_hint TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES course_students(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      granted_at TEXT NOT NULL,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS course_lesson_progress (
      student_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      PRIMARY KEY (student_id, lesson_id)
    );
  `);

  seedCoursesModuleIfNeeded(db);

  try {
    db.exec("ALTER TABLE site_settings ADD COLUMN whatsapp_direct_phone TEXT");
  } catch {
    // column already exists
  }
  try {
    db.exec("ALTER TABLE site_settings ADD COLUMN whatsapp_direct_message_template TEXT");
  } catch {
    // column already exists
  }

  const existingSettings = db
    .prepare("SELECT id FROM site_settings WHERE id = 'main'")
    .get();

  if (existingSettings) {
    return;
  }

  const now = new Date().toISOString();

  // 1. Seed Admin User
  const adminEmail =
    process.env.ADMIN_EMAIL || "admin@fernandacaetano.com.br";
  const adminPassword = process.env.ADMIN_PASSWORD || "Fernanda@2026";
  const adminUserId = "user-admin-fernanda";

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', ?, ?)`
  ).run(adminUserId, adminEmail, hashPassword(adminPassword), now, now);

  db.prepare(
    `INSERT INTO admin_profiles (id, user_id, full_name, professional_title, registration_number, whatsapp_phone, receive_whatsapp_alerts, avatar_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    "profile-fernanda",
    adminUserId,
    "Dra. Fernanda Caetano",
    "Enfermeira Dermatológica e Esteta • Especialista em Feridas e Estética Avançada",
    "COREN-RJ (Configurável no Painel)",
    "5522999990000",
    "/images/fernanda-portrait.svg",
    now
  );

  // 2. Seed Site Settings
  const highlights = [
    {
      title: "Enfermagem Dermatológica & Feridas",
      description:
        "Avaliação criteriosa e condução especializada no tratamento de feridas complexas com coberturas tecnológicas e laserterapia.",
    },
    {
      title: "Estética Avançada com Segurança",
      description:
        "Protocolos individualizados com foco em naturalidade, cuidado tissular e rigor técnico em cada procedimento.",
    },
    {
      title: "Atendimento em Consultório e Home Care",
      description:
        "Estrutura preparada no Farol de São Thomé e Edifício Platinum, além de modalidade domiciliar sob agendamento.",
    },
  ];

  db.prepare(
    `INSERT INTO site_settings (
      id, professional_name, professional_subtitle, professional_bio, hero_badge,
      avatar_url, instagram_url, instagram_handle,
      primary_color, accent_color, background_color, gold_color,
      booking_mode, online_booking_enabled, min_advance_hours, max_advance_days, slot_interval_minutes,
      booking_success_message, privacy_policy_text, about_full_text, about_highlights_json,
      draft_json, published_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
  ).run(
    "main",
    "Fernanda Caetano",
    "Enfermeira Dermatológica e Esteta",
    "Especialista em Tratamento Avançado de Feridas, Laserterapia e Estética Avançada. Cuidado técnico, acolhedor e personalizado em cada atendimento.",
    "FERIDAS • LASERTERAPIA • ESTÉTICA AVANÇADA",
    "/images/fernanda-portrait.svg",
    "https://www.instagram.com/enfernandacaetano/",
    "@enfernandacaetano",
    "#07152B",
    "#D97732",
    "#F7F5F1",
    "#C5A46D",
    "automatic",
    1,
    1,
    60,
    30,
    "Seu atendimento foi registrado com atenção em nossa agenda. Caso precise ajustar qualquer detalhe, nossa equipe está à disposição pelo WhatsApp da unidade escolhida.",
    "Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), coletamos exclusivamente os dados cadastrais mínimos (nome completo, telefone WhatsApp e e-mail opcional) com a finalidade estrita de organizar seu agendamento, enviar confirmações e lembretes de atendimento. Não solicitamos nem armazenamos informações clínicas sensíveis, diagnósticos ou imagens médicas através deste formulário online. Você pode solicitar a atualização ou exclusão de seus dados de contato a qualquer momento junto à administração do consultório.",
    "Fernanda Caetano é Enfermeira Dermatológica e Esteta, dedicando sua prática clínica ao cuidado integral da pele, reabilitação tecidual em feridas agudas e crônicas e procedimentos de estética avançada. Com atendimento humanizado e protocolos respaldados pelas melhores práticas da enfermagem dermatológica, oferece acompanhamento presencial no Farol de São Thomé e no Edifício Platinum, além de suporte domiciliar (Home Care) planejado.",
    JSON.stringify(highlights),
    now,
    now
  );

  // 3. Seed Site Sections
  const sections = [
    {
      id: "links",
      title: "Acesso Rápido",
      subtitle: "Canais oficiais e agendamento online",
      is_visible: 1,
      sort_order: 1,
    },
    {
      id: "featured_procedures",
      title: "Procedimentos & Especialidades",
      subtitle: "Conheça os cuidados disponíveis para agendamento",
      is_visible: 1,
      sort_order: 2,
    },
    {
      id: "units",
      title: "Unidades de Atendimento",
      subtitle: "Consultórios planejados para seu conforto e segurança",
      is_visible: 1,
      sort_order: 3,
    },
    {
      id: "about",
      title: "Sobre a Profissional",
      subtitle: "Excelência técnica e acolhimento em Enfermagem Dermatológica",
      is_visible: 1,
      sort_order: 4,
    },
  ];

  const insertSection = db.prepare(
    `INSERT INTO site_sections (id, title, subtitle, is_visible, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const s of sections) {
    insertSection.run(s.id, s.title, s.subtitle, s.is_visible, s.sort_order, now);
  }

  // 4. Seed Units
  const units = [
    {
      id: "unit-farol",
      slug: "farol-de-sao-thome",
      name: "Consultório | Farol de São Thomé",
      short_name: "Farol",
      description:
        "Atendimento presencial em consultório equipado para enfermagem dermatológica, tratamento de feridas e estética avançada.",
      address_line: "Endereço configurável no Painel Administrativo (Dado de demonstração)",
      neighborhood_city: "Farol de São Thomé — Campos dos Goytacazes/RJ",
      maps_url: "https://maps.google.com/?q=Farol+de+Sao+Thome+Campos+dos+Goytacazes",
      whatsapp_phone: "5522999990001",
      modality: "presencial",
      is_active: 1,
      is_demo_data: 1,
      sort_order: 1,
    },
    {
      id: "unit-platinum",
      slug: "edificio-platinum",
      name: "Consultório | Ed. Platinum",
      short_name: "Platinum",
      description:
        "Estrutura moderna e reservada no Edifício Platinum para consultas, laserterapia, curativos especiais e procedimentos estéticos.",
      address_line: "Edifício Platinum — Sala configurável no Painel (Dado de demonstração)",
      neighborhood_city: "Centro / Pelinca — Campos dos Goytacazes/RJ",
      maps_url: "https://maps.google.com/?q=Edificio+Platinum+Campos+dos+Goytacazes",
      whatsapp_phone: "5522999990002",
      modality: "presencial",
      is_active: 1,
      is_demo_data: 1,
      sort_order: 2,
    },
    {
      id: "unit-homecare",
      slug: "home-care",
      name: "Atendimento Domiciliar (Home Care)",
      short_name: "Home Care",
      description:
        "Cuidado especializado no conforto do domicílio, sujeito à confirmação de rota e disponibilidade pela profissional.",
      address_line: "Atendimento no endereço informado pelo paciente na solicitação",
      neighborhood_city: "Região de cobertura sob confirmação administrativa",
      maps_url: "",
      whatsapp_phone: "5522999990001",
      modality: "domiciliar",
      is_active: 1,
      is_demo_data: 1,
      sort_order: 3,
    },
  ];

  const insertUnit = db.prepare(
    `INSERT INTO units (
      id, slug, name, short_name, description, address_line, neighborhood_city,
      maps_url, whatsapp_phone, modality, is_active, is_demo_data, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const u of units) {
    insertUnit.run(
      u.id,
      u.slug,
      u.name,
      u.short_name,
      u.description,
      u.address_line,
      u.neighborhood_city,
      u.maps_url,
      u.whatsapp_phone,
      u.modality,
      u.is_active,
      u.is_demo_data,
      u.sort_order,
      now,
      now
    );
  }

  // 5. Seed Custom Links (8 Initial Required Buttons)
  const initialLinks = [
    {
      id: "link-1-agendar",
      title: "Agende seu procedimento",
      subtitle: "Escolha o serviço, unidade e horário disponível online",
      icon_name: "CalendarCheck",
      destination_type: "booking",
      destination_value: "/agendar",
      whatsapp_message: null,
      style_variant: "primary_cta",
      badge_text: "ONLINE",
      is_active: 1,
      sort_order: 1,
    },
    {
      id: "link-2-procedimentos",
      title: "Conheça nossos procedimentos",
      subtitle: "Feridas, Laserterapia, Estética Avançada e Cuidados",
      icon_name: "Sparkles",
      destination_type: "internal_page",
      destination_value: "/procedimentos",
      whatsapp_message: null,
      style_variant: "navy",
      badge_text: null,
      is_active: 1,
      sort_order: 2,
    },
    {
      id: "link-3-unit-farol",
      title: "Consultório | Farol de São Thomé",
      subtitle: "Ver localização, horários e procedimentos na unidade Farol",
      icon_name: "MapPin",
      destination_type: "unit",
      destination_value: "farol-de-sao-thome",
      whatsapp_message: null,
      style_variant: "default",
      badge_text: "UNIDADE",
      is_active: 1,
      sort_order: 3,
    },
    {
      id: "link-4-unit-platinum",
      title: "Consultório | Ed. Platinum",
      subtitle: "Ver localização, horários e procedimentos no Ed. Platinum",
      icon_name: "Building2",
      destination_type: "unit",
      destination_value: "edificio-platinum",
      whatsapp_message: null,
      style_variant: "default",
      badge_text: "UNIDADE",
      is_active: 1,
      sort_order: 4,
    },
    {
      id: "link-5-whats-farol",
      title: "WhatsApp | Farol",
      subtitle: "Falar diretamente com o atendimento do Farol de São Thomé",
      icon_name: "MessageCircle",
      destination_type: "whatsapp",
      destination_value: "5522999990001",
      whatsapp_message:
        "Olá! Vim pelo site da Dra. Fernanda Caetano e gostaria de informações sobre atendimento na unidade Farol de São Thomé.",
      style_variant: "default",
      badge_text: null,
      is_active: 1,
      sort_order: 5,
    },
    {
      id: "link-6-whats-platinum",
      title: "WhatsApp | Platinum",
      subtitle: "Falar diretamente com o atendimento do Edifício Platinum",
      icon_name: "MessageCircle",
      destination_type: "whatsapp",
      destination_value: "5522999990002",
      whatsapp_message:
        "Olá! Vim pelo site da Dra. Fernanda Caetano e gostaria de informações sobre atendimento na unidade Ed. Platinum.",
      style_variant: "default",
      badge_text: null,
      is_active: 1,
      sort_order: 6,
    },
    {
      id: "link-7-instagram",
      title: "Instagram",
      subtitle: "@enfernandacaetano • Acompanhe conteúdos e rotina",
      icon_name: "Instagram",
      destination_type: "external_link",
      destination_value: "https://www.instagram.com/enfernandacaetano/",
      whatsapp_message: null,
      style_variant: "outline_gold",
      badge_text: null,
      is_active: 1,
      sort_order: 7,
    },
    {
      id: "link-8-sobre",
      title: "Sobre a profissional",
      subtitle: "Formação, áreas de atuação e filosofia de atendimento",
      icon_name: "Award",
      destination_type: "internal_page",
      destination_value: "/sobre",
      whatsapp_message: null,
      style_variant: "default",
      badge_text: null,
      is_active: 1,
      sort_order: 8,
    },
  ];

  const insertLink = db.prepare(
    `INSERT INTO custom_links (
      id, title, subtitle, icon_name, destination_type, destination_value,
      whatsapp_message, style_variant, badge_text, is_active, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const link of initialLinks) {
    insertLink.run(
      link.id,
      link.title,
      link.subtitle,
      link.icon_name,
      link.destination_type,
      link.destination_value,
      link.whatsapp_message,
      link.style_variant,
      link.badge_text,
      link.is_active,
      link.sort_order,
      now,
      now
    );
  }

  // 6. Seed Procedure Categories & 9 Initial Reference Procedures
  const categories = [
    {
      id: "cat-feridas",
      slug: "feridas-e-reabilitacao",
      name: "Feridas & Reabilitação Tecidual",
      description:
        "Cuidado especializado em feridas, curativos tecnológicos e fotobiomodulação.",
      sort_order: 1,
    },
    {
      id: "cat-estetica",
      slug: "estetica-avancada",
      name: "Estética Avançada & Dermatológica",
      description:
        "Procedimentos estéticos e dermatológicos realizados com rigor técnico.",
      sort_order: 2,
    },
    {
      id: "cat-enfermagem",
      slug: "cuidados-de-enfermagem",
      name: "Procedimentos de Enfermagem & Home Care",
      description:
        "Administração de medicamentos e assistência domiciliar personalizada.",
      sort_order: 3,
    },
  ];

  const insertCategory = db.prepare(
    `INSERT INTO procedure_categories (id, slug, name, description, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`
  );
  for (const c of categories) {
    insertCategory.run(c.id, c.slug, c.name, c.description, c.sort_order);
  }

  const initialProcedures = [
    {
      id: "proc-feridas",
      slug: "tratamento-de-feridas-tecnologias-avancadas",
      category_id: "cat-feridas",
      name: "Tratamento de feridas com tecnologias avançadas",
      short_description:
        "Avaliação e condução especializada com coberturas interativas e recursos tecnológicos para reparo tecidual.",
      full_description:
        "Atendimento voltado à avaliação criteriosa do leito da lesão, escolha individualizada de coberturas avançadas e acompanhamento sistematizado da evolução cicatricial. Todas as orientações específicas são fornecidas presencialmente durante a consulta de enfermagem dermatológica. (Texto inicial configurável pela profissional).",
      duration_minutes: 60,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Trazer lista de medicamentos em uso e exames anteriores, caso possua.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 1,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-laserterapia",
      slug: "laserterapia",
      category_id: "cat-feridas",
      name: "Laserterapia",
      short_description:
        "Sessão de fotobiomodulação aplicada ao cuidado tecidual e protocolos dermatológicos.",
      full_description:
        "Utilização de laser de baixa intensidade em protocolos individualizados de enfermagem dermatológica para estímulo ao reparo tecidual e modulação inflamatória, conforme avaliação técnica prévia. (Texto inicial configurável pela profissional).",
      duration_minutes: 45,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Comparecer com a região limpa e sem aplicação prévia de cremes ou pomadas no dia do atendimento.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 2,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-curativos",
      slug: "curativos",
      category_id: "cat-feridas",
      name: "Curativos",
      short_description:
        "Realização técnica de curativos especiais e acompanhamento periódico.",
      full_description:
        "Procedimento de limpeza técnica, manejo seguro e aplicação de coberturas adequadas a cada fase do processo de cicatrização, respeitando normas rigorosas de biossegurança.",
      duration_minutes: 45,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Chegar com 10 minutos de antecedência para recepção tranquila.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 3,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-lobuloplastia",
      slug: "lobuloplastia",
      category_id: "cat-estetica",
      name: "Lobuloplastia",
      short_description:
        "Cuidado estético e reparador para lóbulo auricular sem cirurgia invasiva.",
      full_description:
        "Avaliação e procedimento voltado à reestruturação estética do lóbulo auricular, realizado em consultório com técnica segura e orientações completas de cuidado pós-procedimento.",
      duration_minutes: 60,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Não utilizar brincos na região no dia do atendimento.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 4,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-verrugas",
      slug: "tratamento-de-verrugas-e-acrocordons",
      category_id: "cat-estetica",
      name: "Tratamento de verrugas e acrocórdons",
      short_description:
        "Avaliação dermatológica de enfermagem e remoção cuidadosa de acrocórdons.",
      full_description:
        "Atendimento dedicado à avaliação prévia das lesões cutâneas benignas elegíveis ao protocolo de enfermagem dermatológica, com foco em conforto, segurança e recuperação adequada da pele.",
      duration_minutes: 60,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Passar por avaliação inicial durante o horário agendado.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 5,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-botox",
      slug: "botox",
      category_id: "cat-estetica",
      name: "Botox",
      short_description:
        "Protocolo de toxina botulínica com planejamento facial personalizado e naturalidade.",
      full_description:
        "Avaliação anatômica facial detalhada e aplicação de toxina botulínica respeitando a harmonia e expressividade individual de cada paciente, mediante consulta e alinhamento de expectativas.",
      duration_minutes: 60,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Comparecer com a pele limpa, sem maquiagem na região a ser avaliada.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 6,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-peim",
      slug: "peim",
      category_id: "cat-estetica",
      name: "PEIM",
      short_description:
        "Procedimento Estético Injetável para Microvasos com avaliação individualizada.",
      full_description:
        "Sessão estruturada para o cuidado estético de microvasos (telangiectasias), precedida por avaliação técnica e orientações de cuidados pré e pós-atendimento.",
      duration_minutes: 60,
      buffer_after_minutes: 15,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Evitar exposição solar intensa e uso de autobronzeadores nos dias anteriores ao atendimento.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 7,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-medicamentos",
      slug: "administracao-de-medicamentos",
      category_id: "cat-enfermagem",
      name: "Administração de medicamentos",
      short_description:
        "Aplicação técnica segura mediante apresentação obrigatória de prescrição válida.",
      full_description:
        "Procedimento realizado exclusivamente mediante apresentação de receita/prescrição legível e dentro da validade, seguindo todos os protocolos de segurança do paciente e preparo técnico.",
      duration_minutes: 30,
      buffer_after_minutes: 10,
      price_cents: null,
      show_price: 0,
      modality: "presencial",
      preparation_instructions:
        "Obrigatório apresentar a prescrição original e o medicamento devidamente acondicionado.",
      online_booking_enabled: 1,
      requires_approval: 0,
      sort_order: 8,
      units: ["unit-farol", "unit-platinum"],
    },
    {
      id: "proc-homecare",
      slug: "atendimento-domiciliar-home-care",
      category_id: "cat-enfermagem",
      name: "Atendimento domiciliar (Home Care)",
      short_description:
        "Assistência de enfermagem dermatológica, curativos e laserterapia em domicílio.",
      full_description:
        "Modalidade destinada a pacientes que necessitam de atendimento no domicílio. Ao solicitar o horário pelo site, nossa administração revisa o endereço e confirma o encaixe ideal de deslocamento.",
      duration_minutes: 90,
      buffer_after_minutes: 30,
      price_cents: null,
      show_price: 0,
      modality: "domiciliar",
      preparation_instructions:
        "Informe o bairro/referência na etapa de identificação para confirmação da rota.",
      online_booking_enabled: 1,
      requires_approval: 1, // Fluxo com confirmação administrativa
      sort_order: 9,
      units: ["unit-homecare"],
    },
  ];

  const insertProc = db.prepare(
    `INSERT INTO procedures (
      id, slug, category_id, name, short_description, full_description,
      image_url, duration_minutes, buffer_before_minutes, buffer_after_minutes,
      price_cents, show_price, modality, preparation_instructions,
      online_booking_enabled, requires_approval, is_visible_public, is_active, is_archived,
      sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, ?, ?)`
  );

  const insertProcUnit = db.prepare(
    `INSERT INTO procedure_units (procedure_id, unit_id) VALUES (?, ?)`
  );

  for (const p of initialProcedures) {
    insertProc.run(
      p.id,
      p.slug,
      p.category_id,
      p.name,
      p.short_description,
      p.full_description,
      p.duration_minutes,
      p.buffer_after_minutes,
      p.price_cents,
      p.show_price,
      p.modality,
      p.preparation_instructions,
      p.online_booking_enabled,
      p.requires_approval,
      p.sort_order,
      now,
      now
    );
    for (const uId of p.units) {
      insertProcUnit.run(p.id, uId);
    }
  }

  // 7. Seed Working Hours (Configuração Inicial de Demonstração Editável)
  // Configuramos horários amplos para que todos os dias úteis tenham disponibilidade no calendário,
  // identificando como configuração inicial editável pela Fernanda.
  const insertWh = db.prepare(
    `INSERT INTO working_hours (id, unit_id, day_of_week, is_open, shifts_json)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const unit of units) {
    for (let day = 0; day <= 6; day++) {
      let isOpen = 1;
      let shifts = [
        { start: "08:30", end: "12:30" },
        { start: "13:30", end: "18:30" },
      ];

      if (day === 0) {
        // Domingo fechado
        isOpen = 0;
        shifts = [];
      } else if (day === 6) {
        // Sábado manhã
        isOpen = 1;
        shifts = [{ start: "08:30", end: "13:00" }];
      }

      insertWh.run(
        `wh-${unit.id}-${day}`,
        unit.id,
        day,
        isOpen,
        JSON.stringify(shifts)
      );
    }
  }

  // 8. Seed Demo Clients & Sample Appointments (including Nov 12, 2026 from User Prompt!)
  const demoClients = [
    {
      id: "client-mariana",
      full_name: "Mariana Silva (Demo)",
      whatsapp_phone: "5522998112233",
      email: "mariana.demo@exemplo.com",
      notes: "Cliente demonstração para visualização da agenda.",
    },
    {
      id: "client-ana",
      full_name: "Ana Costa (Demo)",
      whatsapp_phone: "5522998223344",
      email: "ana.costa.demo@exemplo.com",
      notes: "Solicitou avaliação de curativo na unidade Farol.",
    },
    {
      id: "client-juliana",
      full_name: "Juliana Martins (Demo)",
      whatsapp_phone: "5522998334455",
      email: "juliana.demo@exemplo.com",
      notes: "Acompanhamento de feridas no Ed. Platinum.",
    },
  ];

  const insertClient = db.prepare(
    `INSERT INTO clients (id, full_name, whatsapp_phone, email, notes, lgpd_consent_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const c of demoClients) {
    insertClient.run(
      c.id,
      c.full_name,
      c.whatsapp_phone,
      c.email,
      c.notes,
      now,
      now,
      now
    );
  }

  // Format today's date in Sao Paulo and also Nov 12, 2026 (from the user's prompt illustration)
  const insertAppt = db.prepare(
    `INSERT INTO appointments (
      id, booking_code, client_id, procedure_id, unit_id,
      client_name_snapshot, client_phone_snapshot, client_email_snapshot,
      procedure_name_snapshot, unit_name_snapshot,
      duration_minutes, buffer_after_minutes, price_cents_snapshot,
      appointment_date, shift, start_time, end_time, occupied_until_time,
      status, source, client_notes, admin_notes, home_care_address,
      whatsapp_reminder_sent, whatsapp_confirmation_sent, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'admin_manual', ?, ?, NULL, 0, 1, ?, ?)`
  );

  const demoAppointments = [
    // Exatamente os 3 atendimentos do exemplo ilustrativo do prompt em 12 de novembro de 2026:
    {
      id: "appt-demo-nov12-1",
      code: "FC-120901",
      clientId: "client-mariana",
      clientName: "Mariana Silva",
      clientPhone: "5522998112233",
      clientEmail: "mariana.demo@exemplo.com",
      procId: "proc-laserterapia",
      procName: "Laserterapia",
      unitId: "unit-platinum",
      unitName: "Platinum",
      duration: 45,
      buffer: 15,
      date: "2026-11-12",
      shift: "morning",
      start: "09:00",
      end: "09:45",
      occupied: "10:00",
      status: "confirmed",
      notes: "Agendamento de demonstração (conforme prévia solicitada).",
    },
    {
      id: "appt-demo-nov12-2",
      code: "FC-121130",
      clientId: "client-ana",
      clientName: "Ana Costa",
      clientPhone: "5522998223344",
      clientEmail: "ana.costa.demo@exemplo.com",
      procId: "proc-curativos",
      procName: "Curativo",
      unitId: "unit-farol",
      unitName: "Farol",
      duration: 45,
      buffer: 15,
      date: "2026-11-12",
      shift: "morning",
      start: "11:30",
      end: "12:15",
      occupied: "12:30",
      status: "pending",
      notes: "Aguardando confirmação administrativa.",
    },
    {
      id: "appt-demo-nov12-3",
      code: "FC-121400",
      clientId: "client-juliana",
      clientName: "Juliana Martins",
      clientPhone: "5522998334455",
      clientEmail: "juliana.demo@exemplo.com",
      procId: "proc-feridas",
      procName: "Avaliação de feridas",
      unitId: "unit-platinum",
      unitName: "Platinum",
      duration: 60,
      buffer: 15,
      date: "2026-11-12",
      shift: "afternoon",
      start: "14:00",
      end: "15:00",
      occupied: "15:15",
      status: "confirmed",
      notes: "Retorno programado no Edifício Platinum.",
    },
    // Também adicionamos agendamentos na primeira semana de novembro de 2026 para o dashboard ficar rico
    {
      id: "appt-demo-nov02-1",
      code: "FC-020930",
      clientId: "client-mariana",
      clientName: "Mariana Silva",
      clientPhone: "5522998112233",
      clientEmail: "mariana.demo@exemplo.com",
      procId: "proc-botox",
      procName: "Botox",
      unitId: "unit-platinum",
      unitName: "Platinum",
      duration: 60,
      buffer: 15,
      date: "2026-11-02",
      shift: "morning",
      start: "09:30",
      end: "10:30",
      occupied: "10:45",
      status: "confirmed",
      notes: "Avaliação e protocolo facial.",
    },
    {
      id: "appt-demo-nov03-1",
      code: "FC-031500",
      clientId: "client-ana",
      clientName: "Ana Costa",
      clientPhone: "5522998223344",
      clientEmail: "ana.costa.demo@exemplo.com",
      procId: "proc-homecare",
      procName: "Atendimento domiciliar (Home Care)",
      unitId: "unit-homecare",
      unitName: "Home Care",
      duration: 90,
      buffer: 30,
      date: "2026-11-03",
      shift: "afternoon",
      start: "15:00",
      end: "16:30",
      occupied: "17:00",
      status: "pending",
      notes: "Solicitação de Home Care para confirmação.",
    },
  ];

  for (const a of demoAppointments) {
    insertAppt.run(
      a.id,
      a.code,
      a.clientId,
      a.procId,
      a.unitId,
      a.clientName,
      a.clientPhone,
      a.clientEmail,
      a.procName,
      a.unitName,
      a.duration,
      a.buffer,
      a.date,
      a.shift,
      a.start,
      a.end,
      a.occupied,
      a.status,
      a.notes,
      "Registro inicial de demonstração",
      now,
      now
    );
  }

  // 9. Seed Notifications
  db.prepare(
    `INSERT INTO notifications (id, event_type, title, message, appointment_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(
    "notif-1",
    "pending_request",
    "Solicitação aguardando confirmação",
    "Ana Costa solicitou Curativo (Farol) para 12/11/2026 às 11:30.",
    "appt-demo-nov12-2",
    now
  );

  // 10. Seed WhatsApp Bot Config (Estilo Bot da Barbearia com templates editáveis e QR Code)
  const defaultClientBookingTpl =
    "Olá *{clienteName}*! ✨\n\nRecebemos o seu agendamento com a *Dra. Fernanda Caetano*:\n\n• *Procedimento:* {procedimentoName}\n• *Unidade:* {unidadeName}\n• *Data:* {data} às *{horario}*\n• *Código:* {codigo}\n• *Status:* {status}\n\nQualquer dúvida, estamos à disposição por este canal!";

  const defaultClientReminderTpl =
    "Olá *{clienteName}*! 👋\n\nEste é um lembrete automático de que o seu atendimento de *{procedimentoName}* com a *Dra. Fernanda Caetano* na unidade *{unidadeName}* acontecerá em breve (hoje, {data}, às *{horario}*).\n\nContamos com sua presença! ✨";

  const defaultProfAlertTpl =
    "🔔 *Alerta da Agenda — Dra. Fernanda Caetano*\n\n• *Paciente:* {clienteName} ({clienteTelefone})\n• *Procedimento:* {procedimentoName}\n• *Unidade:* {unidadeName}\n• *Data/Hora:* {data} às {horario}\n• *Status:* {status}";

  db.prepare(
    `INSERT INTO whatsapp_bot_config (
      id, status, qr_code_data, connected_phone, connected_name,
      auto_confirm_msg_enabled, reminder_2h_enabled, notify_professional_enabled,
      professional_phone, template_client_booking, template_client_reminder,
      template_professional_alert, updated_at
    ) VALUES (?, 'disconnected', NULL, NULL, NULL, 1, 1, 1, ?, ?, ?, ?, ?)`
  ).run(
    "main",
    "5522999990001",
    defaultClientBookingTpl,
    defaultClientReminderTpl,
    defaultProfAlertTpl,
    now
  );
}

function seedCoursesModuleIfNeeded(db: AppDatabase) {
  const existingCourse = db.prepare("SELECT id FROM courses LIMIT 1").get();
  if (existingCourse) return;

  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO courses (
      id, slug, title, subtitle, description, cover_image_url,
      workload_hours, price_display, whatsapp_interest_message,
      is_active, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(
    "course-feridas-laser",
    "manejo-avancado-feridas-laserterapia",
    "Manejo Avançado de Feridas & Laserterapia Clínica",
    "Capacitação teórica e prática com protocolos clínicos da Dra. Fernanda Caetano",
    "Curso completo voltado a profissionais e estudantes de enfermagem que desejam dominar avaliação tecidual, escolha de coberturas tecnológicas, desbridamento e protocolos de fotobiomodulação (Laserterapia e ILIB).",
    "/images/fernanda-portrait.svg",
    "20 horas • Certificado Incluso",
    "R$ 497,00",
    "Olá Dra. Fernanda! Tenho interesse em adquirir o acesso ao curso Manejo Avançado de Feridas & Laserterapia Clínica.",
    1,
    now,
    now
  );

  db.prepare(
    `INSERT INTO courses (
      id, slug, title, subtitle, description, cover_image_url,
      workload_hours, price_display, whatsapp_interest_message,
      is_active, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(
    "course-estetica-avancada",
    "imersao-estetica-avancada-peim-botox",
    "Imersão em Estética Avançada: PEIM, Toxina Botulínica & Lobuloplastia",
    "Protocolos seguros, anatomia aplicada e manejo de intercorrências em consultório",
    "Formação exclusiva com foco na prática clínica segura, diluições, pontos de aplicação, cuidados pós-procedimento e excelência no atendimento estético.",
    "/images/fernanda-portrait.svg",
    "16 horas • Material de Apoio PDF",
    "R$ 697,00",
    "Olá Dra. Fernanda! Quero saber como adquirir o acesso ao curso Imersão em Estética Avançada.",
    2,
    now,
    now
  );

  const insertLesson = db.prepare(
    `INSERT INTO course_lessons (
      id, course_id, module_title, title, description,
      video_source_type, video_url, duration_label,
      attachment_url, attachment_label, is_free_preview, display_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertLesson.run(
    "lesson-1",
    "course-feridas-laser",
    "Módulo 1 — Avaliação Clínica e Preparo do Leito",
    "Aula 01: Boas-vindas e Sistemática de Avaliação de Feridas Complexas",
    "Introdução à metodologia TIME, mensuração clínica, registro fotográfico padronizado e anamnese dermatológica.",
    "local_file",
    "aula-demonstracao.mp4",
    "18 min",
    "",
    "Apostila Módulo 1 (PDF)",
    1,
    1,
    now
  );

  insertLesson.run(
    "lesson-2",
    "course-feridas-laser",
    "Módulo 1 — Avaliação Clínica e Preparo do Leito",
    "Aula 02: Escolha Inteligente de Coberturas e Controle de Exsudato",
    "Quando indicar espumas, alginatos, hidrofibras, matrizes regeneradoras e antimicrobianos tópicos.",
    "local_file",
    "aula-demonstracao.mp4",
    "24 min",
    "",
    "Guia Rápido de Coberturas (PDF)",
    0,
    2,
    now
  );

  insertLesson.run(
    "lesson-3",
    "course-feridas-laser",
    "Módulo 2 — Laserterapia e Fotobiomodulação",
    "Aula 03: Dosimetria, Comprimentos de Onda (Vermelho vs. Infravermelho) e PDT",
    "Parâmetros clínicos em Joules, aplicação pontual vs. varredura e terapia fotodinâmica em feridas infectadas.",
    "local_file",
    "aula-demonstracao.mp4",
    "32 min",
    "",
    "Tabela de Dosimetria Laser (PDF)",
    0,
    3,
    now
  );

  insertLesson.run(
    "lesson-4",
    "course-estetica-avancada",
    "Módulo 1 — Anatomia e Biossegurança",
    "Aula 01: Marcação Facial Segura e Diluição de Toxina Botulínica",
    "Pontos anatômicos essenciais, zonas de risco e protocolos de reconstituição estéril.",
    "local_file",
    "aula-demonstracao.mp4",
    "28 min",
    "",
    "Ficha de Avaliação Facial (PDF)",
    1,
    1,
    now
  );

  // Aluno de demonstração para teste imediato do login
  db.prepare(
    `INSERT INTO course_students (
      id, full_name, email, phone, password_hash, password_plain_hint,
      is_active, expires_at, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, ?)`
  ).run(
    "student-demo-1",
    "Camila Souza (Aluna Teste)",
    "aluna@fernandacaetano.com.br",
    "5522998887766",
    hashPassword("Curso@2026"),
    "Curso@2026",
    "Acesso liberado pela Dra. Fernanda para demonstração da área de membros.",
    now,
    now
  );

  db.prepare(
    `INSERT INTO course_enrollments (id, student_id, course_id, granted_at)
     VALUES (?, ?, ?, ?)`
  ).run("enroll-demo-1", "student-demo-1", "course-feridas-laser", now);

  // Adiciona botão de Cursos na página inicial caso custom_links já exista
  const existingLink = db
    .prepare("SELECT id FROM custom_links WHERE id = 'link-cursos'")
    .get();
  if (!existingLink) {
    const existingSettings = db
      .prepare("SELECT id FROM site_settings WHERE id = 'main'")
      .get();
    if (existingSettings) {
      db.prepare(
        `INSERT INTO custom_links (
          id, title, subtitle, icon_name, destination_type, destination_value,
          style_variant, badge_text, is_active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      ).run(
        "link-cursos",
        "Cursos, Capacitações & Área de Alunos",
        "Acesse as vídeo-aulas exclusivas ou conheça as formações da Dra. Fernanda",
        "GraduationCap",
        "internal_page",
        "/cursos",
        "navy",
        "ACADEMY",
        3,
        now,
        now
      );
    }
  }
}
