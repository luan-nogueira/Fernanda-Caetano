import { Procedure, SiteSettings, Unit } from "@/types/domain";

export function resolveDirectWhatsAppPhone(
  settings?: { whatsapp_direct_phone?: string | null } | null,
  units?: Unit[] | null
): string {
  if (settings?.whatsapp_direct_phone) {
    const digits = settings.whatsapp_direct_phone.replace(/\D/g, "");
    if (digits.length >= 8) return digits;
  }
  if (units && units.length > 0) {
    for (const u of units) {
      if (u.whatsapp_phone) {
        const digits = u.whatsapp_phone.replace(/\D/g, "");
        if (digits.length >= 8) return digits;
      }
    }
  }
  return "5522999990000";
}

export function buildProcedureWhatsAppUrl(
  phone: string,
  procedureName?: string | null,
  template?: string | null
): string {
  const digits = phone.replace(/\D/g, "");
  let message = "";
  if (procedureName) {
    if (template && template.includes("{procedimento}")) {
      message = template.replace("{procedimento}", procedureName);
    } else {
      message = `Olá, Dra. Fernanda! Vi o seu site e gostaria de agendar / saber mais sobre: *${procedureName}*.`;
    }
  } else {
    message = `Olá, Dra. Fernanda! Conheci seu trabalho pelo site e gostaria de agendar uma consulta.`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

