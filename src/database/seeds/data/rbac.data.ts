// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES_DATA = [
  {
    name: 'admin',
    label: 'Administrador',
    description:
      'Control total de la plataforma. Acceso ilimitado a todas las configuraciones, canales y reportes.',
    isEditable: false,
    badge: 'Acceso Total',
    badgeColor: 'bg-rose-500/10 text-rose-400',
    iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  {
    name: 'superAdmin',
    label: 'Super Administrador',
    description:
      'Administrador global de la plataforma con control y acceso total e ilimitado.',
    isEditable: false,
    badge: 'Global Admin',
    badgeColor: 'bg-purple-500/10 text-purple-400',
    iconColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    name: 'manager',
    label: 'Gerente',
    description:
      'Supervisión y gestión operativa del equipo, clientes, canales y agentes de inteligencia artificial.',
    isEditable: true,
    badge: 'Configurable',
    badgeColor: 'bg-indigo-500/10 text-indigo-400',
    iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    name: 'agent',
    label: 'Agente',
    description:
      'Operación diaria del chat, atención a clientes y seguimiento básico de prospectos e inbox.',
    isEditable: true,
    badge: 'Configurable',
    badgeColor: 'bg-emerald-500/10 text-emerald-400',
    iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
];

// ─── Menus ────────────────────────────────────────────────────────────────────

export const MENUS_DATA = [
  // Raíces
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    parent_key: null,
    description:
      'Visualización de gráficos clave, métricas de rendimiento y estadísticas generales del negocio.',
  },
  {
    key: 'crm',
    label: 'CRM',
    path: '/crm',
    parent_key: null,
    description:
      'Acceso a la gestión integral de contactos, tratos, embudos y tareas comerciales.',
  },
  {
    key: 'agents_ia',
    label: 'Agentes IA',
    path: '/agents',
    parent_key: null,
    description:
      'Suite de Inteligencia Artificial para la planificación y optimización del negocio.',
  },
  {
    key: 'inbox',
    label: 'Inbox',
    path: '/inbox',
    parent_key: null,
    description:
      'Bandeja centralizada de comunicación multicanal y respuestas rápidas.',
  },
  {
    key: 'funnels',
    label: 'Embudos',
    path: '/funnels',
    parent_key: null,
    description:
      'Acceso y control de los embudos de venta, páginas de aterrizaje y analítica.',
  },
  {
    key: 'avatar',
    label: 'Avatar',
    path: '/avatar',
    parent_key: null,
    description:
      'Configuración de la identidad, memoria y entrenamiento de los asistentes virtuales.',
  },
  {
    key: 'analytics',
    label: 'Analítica',
    path: '/analytics',
    parent_key: null,
    description:
      'Reportes avanzados de analítica de embudos, conversaciones y agentes.',
  },
  {
    key: 'settings',
    label: 'Configuración',
    path: '/settings',
    parent_key: null,
    description:
      'Configuraciones generales de la plataforma, perfiles, canales y seguridad.',
  },
  // Dashboard subitems
  {
    key: 'dashboard_home',
    label: 'Inicio',
    path: '/dashboard/home',
    parent_key: 'dashboard',
    description: 'Vista general e inicio.',
  },
  // CRM subitems
  {
    key: 'crm_contacts',
    label: 'Contactos',
    path: '/crm/contacts',
    parent_key: 'crm',
    description: 'Listado principal de clientes y leads con filtros avanzados.',
  },
  {
    key: 'crm_leads',
    label: 'Inbox Leads',
    path: '/crm/leads',
    parent_key: 'crm',
    description:
      'Bandeja especializada para nuevos leads capturados en embudos.',
  },
  {
    key: 'crm_deals',
    label: 'Negocios',
    path: '/crm/deals',
    parent_key: 'crm',
    description:
      'Panel Kanban y flujo del pipeline comercial de negocios en curso.',
  },
  {
    key: 'crm_tags',
    label: 'Etiquetas',
    path: '/crm/tags',
    parent_key: 'crm',
    description:
      'Administración de etiquetas para clasificar y segmentar contactos.',
  },
  {
    key: 'crm_tasks',
    label: 'Tareas',
    path: '/crm/tasks',
    parent_key: 'crm',
    description:
      'Creación y asignación de recordatorios y tareas para el equipo.',
  },
  {
    key: 'crm_fields',
    label: 'Campos',
    path: '/crm/fields',
    parent_key: 'crm',
    description:
      'Configuración de atributos personalizados para fichas de clientes.',
  },
  {
    key: 'crm_segments',
    label: 'Segmentos',
    path: '/crm/segments',
    parent_key: 'crm',
    description:
      'Listas dinámicas inteligentes automatizadas según filtros avanzados.',
  },
  // Agentes IA subitems
  {
    key: 'agents_strategy',
    label: 'Estrategia',
    path: '/agents/strategy',
    parent_key: 'agents_ia',
    description: 'Planificador estratégico y generación de planes de marca.',
  },
  {
    key: 'agents_content',
    label: 'Contenido',
    path: '/agents/content',
    parent_key: 'agents_ia',
    description:
      'Generador inteligente de contenidos para copys, posts y correos.',
  },
  {
    key: 'agents_analysis',
    label: 'Análisis',
    path: '/agents/analysis',
    parent_key: 'agents_ia',
    description: 'Analizador automático de métricas e insights sugeridos.',
  },
  // Inbox subitems
  {
    key: 'inbox_conversations',
    label: 'Conversaciones',
    path: '/inbox',
    parent_key: 'inbox',
    description:
      'Chat en vivo para responder a clientes de WhatsApp, Instagram, etc.',
  },
  {
    key: 'inbox_automations',
    label: 'Respuestas rápidas',
    path: '/inbox/automations',
    parent_key: 'inbox',
    description:
      'Gestión de plantillas y automatización de respuestas rápidas.',
  },
  {
    key: 'inbox_channels',
    label: 'Canales',
    path: '/inbox/channels',
    parent_key: 'inbox',
    description: 'Conexión y vinculación de redes sociales de entrada al chat.',
  },
  // Embudos subitems
  {
    key: 'funnels_dashboard',
    label: 'Dashboard',
    path: '/funnels/dashboard',
    parent_key: 'funnels',
    description: 'Estadísticas exclusivas de rendimiento y clics del embudo.',
  },
  {
    key: 'funnels_builder',
    label: 'Constructor',
    path: '/funnels/builder',
    parent_key: 'funnels',
    description: 'Constructor visual de páginas de captura y ventas.',
  },
  {
    key: 'funnels_templates',
    label: 'Plantillas',
    path: '/funnels/templates',
    parent_key: 'funnels',
    description: 'Acceso a la galería de embudos preconfigurados.',
  },
  {
    key: 'funnels_automations',
    label: 'Automatizaciones',
    path: '/funnels/automations',
    parent_key: 'funnels',
    description:
      'Reglas lógicas para disparar correos o acciones en el embudo.',
  },
  {
    key: 'funnels_leads',
    label: 'Leads',
    path: '/funnels/leads',
    parent_key: 'funnels',
    description: 'Prospectos exclusivos capturados a través de los embudos.',
  },
  {
    key: 'funnels_analytics',
    label: 'Analítica',
    path: '/funnels/analytics',
    parent_key: 'funnels',
    description: 'Gráficos detallados de conversión y valor de tráfico.',
  },
  // Avatar subitems
  {
    key: 'avatar_identity',
    label: 'Identidad',
    path: '/avatar/identity',
    parent_key: 'avatar',
    description: 'Configurar tono, voz, personalidad y datos de la IA.',
  },
  {
    key: 'avatar_knowledge',
    label: 'Conocimiento',
    path: '/avatar/knowledge',
    parent_key: 'avatar',
    description:
      'Carga de archivos PDF, URLs y base de conocimiento para la IA.',
  },
  {
    key: 'avatar_voice',
    label: 'Voz',
    path: '/avatar/voice',
    parent_key: 'avatar',
    description: 'Configuración y selección del motor de síntesis de voz.',
  },
  {
    key: 'avatar_memory',
    label: 'Memoria',
    path: '/avatar/memory',
    parent_key: 'avatar',
    description: 'Gestión de la persistencia de contexto e historial de la IA.',
  },
  // Analytics subitems
  {
    key: 'analytics_general',
    label: 'General',
    path: '/analytics/general',
    parent_key: 'analytics',
    description: 'Resumen global e histórico del rendimiento comercial.',
  },
  {
    key: 'analytics_convs',
    label: 'Conversaciones',
    path: '/analytics/conversations',
    parent_key: 'analytics',
    description: 'Métricas de tiempos de respuesta y atención del chat.',
  },
  {
    key: 'analytics_leads',
    label: 'Leads',
    path: '/analytics/leads',
    parent_key: 'analytics',
    description: 'Métricas detalladas del costo y conversión por lead.',
  },
  {
    key: 'analytics_perf',
    label: 'Rendimiento',
    path: '/analytics/performance',
    parent_key: 'analytics',
    description: 'Rendimiento y conversión de los agentes de atención.',
  },
  // Settings subitems
  {
    key: 'settings_config',
    label: 'Configuración',
    path: '/settings/configuracion',
    parent_key: 'settings',
    description: 'Configuración general de la plataforma.',
  },
  {
    key: 'billing',
    label: 'Planes',
    path: '/settings/plans',
    parent_key: 'settings',
    description: 'Visualiza y gestiona tu plan de suscripción.',
  },
  {
    key: 'settings_my_account',
    label: 'Mi cuenta',
    path: '/settings/my-account',
    parent_key: 'settings',
    description: 'Gestión de la cuenta de usuario, perfil y seguridad.',
  },
  {
    key: 'settings_users',
    label: 'Usuarios',
    path: '/settings/users',
    parent_key: 'settings',
    description:
      'Invitar y administrar colaboradores y sus respectivos accesos.',
  },
  {
    key: 'settings_teams',
    label: 'Equipo',
    path: '/settings/teams',
    parent_key: 'settings',
    description:
      'Definir departamentos o equipos de atención (Ventas, Soporte, etc.).',
  },
  {
    key: 'settings_lifecycle',
    label: 'Ciclo de vida',
    path: '/settings/lifecycle',
    parent_key: 'settings',
    description:
      'Configurar estados del embudo de ventas (Ej: Nuevo, Contactado).',
  },
  {
    key: 'settings_channels',
    label: 'Canales',
    path: '/settings/channels',
    parent_key: 'settings',
    description: 'Vinculación técnica del origen de canales de comunicación.',
  },
];

// ─── Permission sets by role ──────────────────────────────────────────────────

export const ADMIN_MENUS = MENUS_DATA.map((m) => m.key);

export const MANAGER_MENUS = MENUS_DATA.filter(
  (m) => !['billing', 'settings_users'].includes(m.key),
).map((m) => m.key);

export const AGENT_MENUS = [
  'dashboard',
  'dashboard_home',
  'crm',
  'crm_contacts',
  'crm_leads',
  'crm_deals',
  'crm_tasks',
  'crm_segments',
  'inbox',
  'inbox_conversations',
  'funnels',
  'funnels_leads',
  'settings',
  'settings_config',
  'settings_my_account',
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  superAdmin: ADMIN_MENUS,
  admin: ADMIN_MENUS,
  manager: MANAGER_MENUS,
  agent: AGENT_MENUS,
};
