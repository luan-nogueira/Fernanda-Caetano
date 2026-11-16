import { getDb } from "./db";
import {
  CustomLink,
  Procedure,
  ProcedureCategory,
  SiteSection,
  SiteSettings,
  Unit,
} from "@/types/domain";

export interface PublicSiteBundle {
  settings: SiteSettings;
  sections: SiteSection[];
  links: CustomLink[];
  units: Unit[];
  categories: ProcedureCategory[];
  procedures: Procedure[];
}

export function getPublicSiteBundle(options?: {
  previewDraft?: boolean;
}): PublicSiteBundle {
  const db = getDb();

  let settings = db
    .prepare("SELECT * FROM site_settings WHERE id = 'main'")
    .get() as SiteSettings | undefined;

  if (!settings) {
    settings = {
      id: "main",
      professional_name: "Fernanda Caetano",
      professional_subtitle: "Enfermeira Dermatológica e Esteta",
      professional_bio:
        "Especialista em Tratamento Avançado de Feridas, Laserterapia e Estética Avançada. Cuidado técnico, acolhedor e personalizado em cada atendimento.",
      hero_badge: "FERIDAS • LASERTERAPIA • ESTÉTICA AVANÇADA",
      avatar_url: "/images/fernanda-portrait.svg",
      instagram_url: "https://www.instagram.com/enfernandacaetano/",
      instagram_handle: "@enfernandacaetano",
      primary_color: "#07152B",
      accent_color: "#D97732",
      background_color: "#F7F5F1",
      gold_color: "#C5A46D",
      booking_mode: "whatsapp_direct",
      online_booking_enabled: 0,
      whatsapp_direct_phone: "5522999792493",
      whatsapp_direct_message_template:
        "Olá, Dra. Fernanda! Vi o seu site e gostaria de agendar / saber mais sobre: *{procedimento}*.",
      client_enabled_modules_json: undefined,
      min_advance_hours: 1,
      max_advance_days: 60,
      slot_interval_minutes: 30,
      booking_success_message:
        "Solicitação enviada com sucesso! Em breve você receberá a confirmação no WhatsApp.",
      privacy_policy_text: "",
      about_full_text:
        "Fernanda Caetano é Enfermeira Dermatológica e Esteta, dedicando sua prática clínica ao cuidado integral da pele, reabilitação tecidual em feridas agudas e crônicas e procedimentos de estética avançada.",
      about_highlights_json: "[]",
      draft_json: null,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Se o administrador estiver visualizando a prévia (rascunho), mescla os dados do draft_json
  if (options?.previewDraft && settings?.draft_json) {
    try {
      const draftData = JSON.parse(settings.draft_json);
      settings = { ...settings, ...draftData };
    } catch {
      // ignora rascunho malformado
    }
  }

  const sections = db
    .prepare("SELECT * FROM site_sections ORDER BY sort_order ASC")
    .all() as SiteSection[];

  const links = db
    .prepare(
      "SELECT * FROM custom_links WHERE is_active = 1 ORDER BY sort_order ASC"
    )
    .all() as CustomLink[];

  const units = db
    .prepare("SELECT * FROM units WHERE is_active = 1 ORDER BY sort_order ASC")
    .all() as Unit[];

  const categories = db
    .prepare(
      "SELECT * FROM procedure_categories WHERE is_active = 1 ORDER BY sort_order ASC"
    )
    .all() as ProcedureCategory[];

  const proceduresRaw = db
    .prepare(
      `SELECT p.*, c.name as category_name
       FROM procedures p
       LEFT JOIN procedure_categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.is_archived = 0 AND p.is_visible_public = 1
       ORDER BY p.sort_order ASC`
    )
    .all() as Procedure[];

  const procUnitsRows = db
    .prepare("SELECT procedure_id, unit_id FROM procedure_units")
    .all() as Array<{ procedure_id: string; unit_id: string }>;

  const unitMap = new Map(units.map((u) => [u.id, u]));

  const procedures = proceduresRaw.map((p) => {
    const uIds = procUnitsRows
      .filter((r) => r.procedure_id === p.id)
      .map((r) => r.unit_id);
    const linkedUnits = uIds
      .map((id) => unitMap.get(id))
      .filter((u): u is Unit => Boolean(u));
    return {
      ...p,
      unit_ids: uIds,
      units: linkedUnits,
    };
  });

  return {
    settings: settings as SiteSettings,
    sections,
    links,
    units,
    categories,
    procedures,
  };
}

export function getProcedureBySlug(slug: string): Procedure | null {
  const bundle = getPublicSiteBundle();
  return bundle.procedures.find((p) => p.slug === slug) || null;
}

export {
  resolveDirectWhatsAppPhone,
  buildProcedureWhatsAppUrl,
} from "./whatsapp-utils";
import {
  resolveDirectWhatsAppPhone,
  buildProcedureWhatsAppUrl,
} from "./whatsapp-utils";

export function resolveCustomLinkHref(
  link: CustomLink,
  units: Unit[],
  procedures: Procedure[],
  settings?: SiteSettings
): { href: string; external: boolean } {
  const isWhatsappDirect = settings?.booking_mode === "whatsapp_direct";
  const defaultPhone = resolveDirectWhatsAppPhone(settings, units);

  switch (link.destination_type) {
    case "booking": {
      if (isWhatsappDirect) {
        return {
          href: buildProcedureWhatsAppUrl(defaultPhone, null),
          external: true,
        };
      }
      return { href: link.destination_value || "/agendar", external: false };
    }
    case "procedure": {
      const proc = procedures.find(
        (p) =>
          p.slug === link.destination_value || p.id === link.destination_value
      );
      if (proc) {
        if (isWhatsappDirect) {
          return {
            href: buildProcedureWhatsAppUrl(
              defaultPhone,
              proc.name,
              settings?.whatsapp_direct_message_template
            ),
            external: true,
          };
        }
        return {
          href: `/agendar?procedimento=${encodeURIComponent(proc.slug)}`,
          external: false,
        };
      }
      return { href: "/procedimentos", external: false };
    }
    case "unit": {
      const unit = units.find(
        (u) =>
          u.slug === link.destination_value || u.id === link.destination_value
      );
      if (unit) {
        return {
          href: `/unidades#${encodeURIComponent(unit.slug)}`,
          external: false,
        };
      }
      return { href: "/unidades", external: false };
    }
    case "whatsapp": {
      let phone = link.destination_value || "";
      const linkIdLower = (link.id || "").toLowerCase();
      const linkTitleLower = (link.title || "").toLowerCase();

      // Se for link de WhatsApp de unidade, busca dinamicamente o número atualizado daquela unidade
      if (linkIdLower.includes("farol") || linkTitleLower.includes("farol")) {
        const farolUnit = units.find(
          (u) => u.id === "unit-farol" || u.slug.includes("farol")
        );
        if (farolUnit?.whatsapp_phone) {
          phone = farolUnit.whatsapp_phone;
        }
      } else if (
        linkIdLower.includes("platinum") ||
        linkTitleLower.includes("platinum")
      ) {
        const platUnit = units.find(
          (u) => u.id === "unit-platinum" || u.slug.includes("platinum")
        );
        if (platUnit?.whatsapp_phone) {
          phone = platUnit.whatsapp_phone;
        }
      }

      const digits = (phone || "").replace(/\D/g, "") || defaultPhone;
      const msg = link.whatsapp_message
        ? `?text=${encodeURIComponent(link.whatsapp_message)}`
        : "";
      return { href: `https://wa.me/${digits}${msg}`, external: true };
    }
    case "external_link":
      return { href: link.destination_value, external: true };
    case "section":
      return {
        href: `/#${link.destination_value.replace(/^#/, "")}`,
        external: false,
      };
    case "internal_page":
    default:
      return { href: link.destination_value || "/", external: false };
  }
}

