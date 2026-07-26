import { BudgetRange } from '@auth/enums/budget-range.enum';
import { BusinessModel } from '@auth/enums/business-model.enum';
import { BrandTone } from '@auth/enums/brand-tone.enum';
import { GeographicScope } from '@auth/enums/geographic-scope.enum';
import { PrimaryGoal } from '@auth/enums/primary-goal.enum';

export interface BusinessProfileSeedData {
  businessName: string;
  industryName: string;
  nicheDetail: string;
  valueProposition: string;
  mission: string;
  competitors: string[];
  targetAudience: string;
  audienceAgeRange: string;
  businessModel: BusinessModel;
  geographicScope: GeographicScope;
  country: string;
  city: string;
  tone: BrandTone;
  brandVoiceNotes: string;
  locale: string;
  brandColors: { primary: string; secondary: string; accent?: string };
  primaryGoal: PrimaryGoal;
  monthlyBudgetRange: BudgetRange;
  activeChannels: string[];
  teamSize: number;
}

export const BUSINESS_PROFILES_DATA: BusinessProfileSeedData[] = [
  {
    businessName: 'Zyntra Impulse Pro Demo',
    industryName: 'Servicios Profesionales',
    nicheDetail:
      'Agencia de marketing digital full-funnel para PYMEs y agencias que buscan escalar con IA',
    valueProposition:
      'Combinamos estrategia de growth marketing con agentes de IA propios para reducir el costo de adquisición de nuestros clientes hasta un 40%.',
    mission:
      'Democratizar el acceso a marketing de nivel enterprise para negocios en crecimiento.',
    competitors: ['HubSpot Agency Partners', 'Jasper', 'WordStream'],
    targetAudience:
      'Dueños de PYMEs y gerentes de marketing en empresas B2B de 10-200 empleados que necesitan escalar su generación de leads sin armar un equipo interno grande.',
    audienceAgeRange: '30-45',
    businessModel: BusinessModel.B2B,
    geographicScope: GeographicScope.INTERNATIONAL,
    country: 'Estados Unidos',
    city: 'Miami',
    tone: BrandTone.PROFESSIONAL,
    brandVoiceNotes:
      'Directo, orientado a resultados y datos. Evitar jerga de marketing vacía, siempre respaldar afirmaciones con métricas.',
    locale: 'es',
    brandColors: {
      primary: '#6366f1',
      secondary: '#7c3aed',
      accent: '#b95f00',
    },
    primaryGoal: PrimaryGoal.LEADS,
    monthlyBudgetRange: BudgetRange.FROM_5000_TO_10000,
    activeChannels: ['web_chat', 'facebook', 'telegram'],
    teamSize: 18,
  },
  {
    businessName: 'Zyntra BrandStart Demo',
    industryName: 'Comercio',
    nicheDetail:
      'Moda sostenible DTC para la Generación Z: streetwear hecho con materiales reciclados, producido bajo demanda',
    valueProposition:
      'Streetwear premium con impacto ambiental neto positivo, sin el desperdicio textil de la moda rápida tradicional.',
    mission:
      'Que la próxima generación pueda vestirse a la moda sin costarle al planeta.',
    competitors: ['Pangaia', 'Girlfriend Collective', 'Patagonia'],
    targetAudience:
      'Jóvenes urbanos conscientes del medio ambiente, activos en redes sociales, que compran principalmente desde el celular.',
    audienceAgeRange: '18-27',
    businessModel: BusinessModel.B2C,
    geographicScope: GeographicScope.NATIONAL,
    country: 'México',
    city: 'Ciudad de México',
    tone: BrandTone.PLAYFUL,
    brandVoiceNotes:
      'Cercano, con humor, hablar como se habla en redes sociales, nada de tono corporativo. Emojis con moderación.',
    locale: 'es',
    brandColors: { primary: '#10b981', secondary: '#f59e0b' },
    primaryGoal: PrimaryGoal.SALES,
    monthlyBudgetRange: BudgetRange.FROM_1000_TO_5000,
    activeChannels: ['web_chat', 'facebook'],
    teamSize: 6,
  },
  {
    businessName: 'Zyntra Core Digital Demo',
    industryName: 'Tecnología',
    nicheDetail:
      'Plataforma SaaS de gestión de propiedades en alquiler para administradoras inmobiliarias medianas',
    valueProposition:
      'Automatizamos cobros, mantenimiento y comunicación con inquilinos en una sola plataforma, reduciendo la morosidad hasta un 25%.',
    mission:
      'Simplificar la administración de propiedades para que los administradores se enfoquen en crecer su cartera, no en tareas operativas.',
    competitors: ['Buildium', 'AppFolio', 'Rentger'],
    targetAudience:
      'Administradoras de propiedades y propietarios con 20+ unidades en alquiler que hoy gestionan cobros y mantenimiento manualmente.',
    audienceAgeRange: '35-55',
    businessModel: BusinessModel.B2B2C,
    geographicScope: GeographicScope.NATIONAL,
    country: 'Colombia',
    city: 'Bogotá',
    tone: BrandTone.FORMAL,
    brandVoiceNotes:
      'Confiable y preciso, como un asesor financiero. Priorizar claridad sobre creatividad, evitar informalidades.',
    locale: 'es',
    brandColors: {
      primary: '#0ea5e9',
      secondary: '#1e293b',
      accent: '#f59e0b',
    },
    primaryGoal: PrimaryGoal.RETENTION,
    monthlyBudgetRange: BudgetRange.FROM_500_TO_1000,
    activeChannels: ['web_chat', 'telegram'],
    teamSize: 11,
  },
];
