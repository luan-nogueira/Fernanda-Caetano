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
    .get() as SiteSettings;

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
    settings,
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

export function resolveCustomLinkHref(
  link: CustomLink,
  units: Unit[],
  procedures: Procedure[]
): { href: string; external: boolean } {
  switch (link.destination_type) {
    case "booking":
      return { href: link.destination_value || "/agendar", external: false };
    case "procedure": {
      const proc = procedures.find(
        (p) =>
          p.slug === link.destination_value || p.id === link.destination_value
      );
      if (proc) {
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
      const digits = (link.destination_value || "").replace(/\D/g, "");
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

