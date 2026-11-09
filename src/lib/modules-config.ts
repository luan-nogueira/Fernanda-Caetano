export interface AdminModuleItem {
  id: string;
  href: string;
  label: string;
  description: string;
  badge?: string;
  category: "essencial" | "avancado";
  alwaysEnabled?: boolean;
}

export const ADMIN_MODULES: AdminModuleItem[] = [
  {
    id: "dashboard",
    href: "/admin",
    label: "Dashboard",
    description: "Visão geral do consultório, atalhos rápidos e métricas.",
    category: "essencial",
    alwaysEnabled: true,
  },
  {
    id: "agenda",
    href: "/admin/agenda",
    label: "Agenda de Atendimentos",
    description: "Calendário interativo e agendamentos online com pacientes.",
    badge: "Principal",
    category: "avancado",
  },
  {
    id: "cursos",
    href: "/admin/cursos",
    label: "Cursos & Área de Alunos",
    description: "Gestão completa de cursos, aulas, materiais e matrículas.",
    badge: "Novo",
    category: "essencial",
  },
  {
    id: "site",
    href: "/admin/site",
    label: "Editor da Página Pública",
    description: "Personalização de bio, fotos, links e seções do site.",
    category: "essencial",
  },
  {
    id: "whatsapp",
    href: "/admin/whatsapp",
    label: "WhatsApp Bot & QR Code",
    description: "Robô automatizado para confirmações e lembretes automáticos.",
    badge: "Bot",
    category: "avancado",
  },
  {
    id: "procedimentos",
    href: "/admin/procedimentos",
    label: "Procedimentos & Categorias",
    description: "Catálogo de procedimentos, explicações e orçamentos.",
    category: "essencial",
  },
  {
    id: "unidades",
    href: "/admin/unidades",
    label: "Unidades de Atendimento",
    description: "Endereços físicos e consultórios de atendimento.",
    category: "essencial",
  },
  {
    id: "horarios",
    href: "/admin/horarios",
    label: "Horários & Bloqueios",
    description: "Grades de horários online e bloqueios de férias.",
    category: "avancado",
  },
  {
    id: "clientes",
    href: "/admin/clientes",
    label: "Clientes",
    description: "Cadastro de clientes, contatos e histórico clínico.",
    category: "essencial",
  },
  {
    id: "notificacoes",
    href: "/admin/notificacoes",
    label: "Notificações",
    description: "Alertas automáticos de agendamentos e lembretes.",
    category: "avancado",
  },
  {
    id: "configuracoes",
    href: "/admin/configuracoes",
    label: "Configurações & Segurança",
    description: "Dados cadastrais, perfil clínico e senhas de acesso.",
    category: "essencial",
  },
];

// Preset padrão quando a cliente contrata o Plano Essencial (Mais barato)
export const PRESET_ESSENCIAL: Record<string, boolean> = {
  dashboard: true,
  cursos: true,
  site: true,
  procedimentos: true,
  unidades: true,
  clientes: true,
  configuracoes: true,
  agenda: false,
  horarios: false,
  whatsapp: false,
  notificacoes: false,
};

// Preset quando a cliente faz upgrade para o Plano Completo
export const PRESET_COMPLETO: Record<string, boolean> = {
  dashboard: true,
  agenda: true,
  cursos: true,
  site: true,
  whatsapp: true,
  procedimentos: true,
  unidades: true,
  horarios: true,
  clientes: true,
  notificacoes: true,
  configuracoes: true,
};

export function parseClientModules(
  jsonStr?: string | null
): Record<string, boolean> {
  if (!jsonStr) {
    return { ...PRESET_ESSENCIAL };
  }
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        ...PRESET_ESSENCIAL,
        ...parsed,
        dashboard: true, // Dashboard é sempre habilitado
      };
    }
  } catch {
    // fallback
  }
  return { ...PRESET_ESSENCIAL };
}

export function isRouteAllowedForClient(
  pathname: string,
  modulesMap: Record<string, boolean>
): boolean {
  if (pathname === "/admin" || pathname === "/admin/login") {
    return true;
  }

  // Encontra o módulo correspondente à rota
  const matchedModule = ADMIN_MODULES.find((m) => {
    if (m.href === "/admin") return false;
    return pathname === m.href || pathname.startsWith(`${m.href}/`);
  });

  if (!matchedModule) {
    return true;
  }

  if (matchedModule.alwaysEnabled) {
    return true;
  }

  return modulesMap[matchedModule.id] !== false;
}

