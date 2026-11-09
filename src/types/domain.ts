export type DestinationType =
  | "booking"
  | "procedure"
  | "unit"
  | "whatsapp"
  | "internal_page"
  | "external_link"
  | "section";

export type LinkStyleVariant =
  | "primary_cta"
  | "navy"
  | "default"
  | "outline_gold";

export interface CustomLink {
  id: string;
  title: string;
  subtitle: string | null;
  icon_name: string;
  destination_type: DestinationType;
  destination_value: string;
  whatsapp_message: string | null;
  style_variant: LinkStyleVariant;
  badge_text: string | null;
  is_active: number | boolean;
  sort_order: number;
}

export interface SiteSettings {
  id: string;
  professional_name: string;
  professional_subtitle: string;
  professional_bio: string;
  hero_badge: string;
  avatar_url: string;
  instagram_url: string;
  instagram_handle: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  gold_color: string;
  booking_mode: "automatic" | "approval" | "whatsapp_direct";
  online_booking_enabled: number | boolean;
  whatsapp_direct_phone?: string;
  whatsapp_direct_message_template?: string;
  min_advance_hours: number;
  max_advance_days: number;
  slot_interval_minutes: number;
  booking_success_message: string;
  privacy_policy_text: string;
  about_full_text: string;
  about_highlights_json: string;
  draft_json: string | null;
  published_at: string;
  updated_at: string;
}

export interface SiteSection {
  id: string;
  title: string;
  subtitle: string | null;
  is_visible: number | boolean;
  sort_order: number;
}

export interface Unit {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  description: string | null;
  address_line: string;
  neighborhood_city: string;
  maps_url: string | null;
  whatsapp_phone: string;
  modality: "presencial" | "domiciliar";
  is_active: number | boolean;
  is_demo_data: number | boolean;
  sort_order: number;
}

export interface ProcedureCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: number | boolean;
}

export interface Procedure {
  id: string;
  slug: string;
  category_id: string;
  category_name?: string;
  name: string;
  short_description: string;
  full_description: string;
  image_url: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_cents: number | null;
  show_price: number | boolean;
  modality: "presencial" | "domiciliar";
  preparation_instructions: string | null;
  online_booking_enabled: number | boolean;
  requires_approval: number | boolean;
  is_visible_public: number | boolean;
  is_active: number | boolean;
  is_archived: number | boolean;
  sort_order: number;
  unit_ids?: string[];
  units?: Unit[];
}

export interface ShiftWindow {
  start: string; // HH:MM
  end: string;   // HH:MM
}

export interface WorkingHours {
  id: string;
  unit_id: string;
  day_of_week: number; // 0-6
  is_open: number | boolean;
  shifts_json: string;
  shifts?: ShiftWindow[];
}

export interface AvailabilityException {
  id: string;
  exception_date: string; // YYYY-MM-DD
  unit_id: string | null;
  exception_type: "holiday" | "vacation" | "day_off" | "custom_hours";
  title: string;
  is_closed: number | boolean;
  custom_shifts_json: string | null;
}

export interface ScheduleBlock {
  id: string;
  block_date: string; // YYYY-MM-DD
  unit_id: string | null;
  is_full_day: number | boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string;
}

export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  booking_code: string;
  client_id: string;
  procedure_id: string;
  unit_id: string;
  client_name_snapshot: string;
  client_phone_snapshot: string;
  client_email_snapshot: string | null;
  procedure_name_snapshot: string;
  unit_name_snapshot: string;
  duration_minutes: number;
  buffer_after_minutes: number;
  price_cents_snapshot: number | null;
  appointment_date: string; // YYYY-MM-DD
  shift: "morning" | "afternoon" | "evening";
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  occupied_until_time: string; // HH:MM
  status: AppointmentStatus;
  source: "online" | "admin_manual";
  client_notes: string | null;
  admin_notes: string | null;
  home_care_address: string | null;
  whatsapp_reminder_sent: number | boolean;
  whatsapp_confirmation_sent: number | boolean;
  created_at: string;
}

export interface ClientRecord {
  id: string;
  full_name: string;
  whatsapp_phone: string;
  email: string | null;
  notes: string | null;
  lgpd_consent_at: string | null;
  created_at: string;
  total_appointments?: number;
  completed_count?: number;
  upcoming_count?: number;
  cancelled_count?: number;
  last_appointment_date?: string | null;
}

export interface WhatsAppBotConfig {
  id: string;
  status: "disconnected" | "qr_ready" | "authenticated" | "connected";
  qr_code_data: string | null;
  connected_phone: string | null;
  connected_name: string | null;
  auto_confirm_msg_enabled: number | boolean;
  reminder_2h_enabled: number | boolean;
  notify_professional_enabled: number | boolean;
  professional_phone: string;
  template_client_booking: string;
  template_client_reminder: string;
  template_professional_alert: string;
  updated_at: string;
}

export interface WhatsAppMessageLog {
  id: string;
  appointment_id: string | null;
  recipient_type: "client" | "professional" | "test";
  recipient_name: string;
  recipient_phone: string;
  message_type: string;
  message_content: string;
  delivery_mode: string;
  status: string;
  created_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover_image_url: string;
  workload_hours: string;
  price_display: string;
  whatsapp_interest_message: string;
  is_active: number | boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  lessons_count?: number;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  module_title: string;
  title: string;
  description: string;
  video_source_type: "local_file" | "external_url";
  video_url: string;
  duration_label: string;
  attachment_url: string;
  attachment_label: string;
  is_free_preview: number | boolean;
  display_order: number;
  created_at: string;
}

export interface CourseStudent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  password_plain_hint: string;
  is_active: number | boolean;
  expires_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  enrolled_course_ids?: string[];
}


