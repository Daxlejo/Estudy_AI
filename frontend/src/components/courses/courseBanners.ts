import type { CourseBannerKey } from '../../types/course'

export interface CourseBannerDefinition {
  key: CourseBannerKey
  labelKey: string
  descKey: string
  defaultLabel: string
  defaultDesc: string
  // Multi-layer CSS background-image definition (local only, no external URLs)
  backgroundImage: string
  // Base background color fallback
  backgroundColor: string
  // Accent border/glow color for UI harmony
  accentColor: string
}

const SUBTLE_GRID_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'%3E%3Cpath d='M0 18h36M18 0v36'/%3E%3C/g%3E%3C/svg%3E")`

const SUBTLE_DOTS_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='4' cy='4' r='1.2' fill='rgba(255,255,255,0.12)'/%3E%3Ccircle cx='16' cy='16' r='1.2' fill='rgba(255,255,255,0.08)'/%3E%3C/svg%3E")`

const PAPER_LINES_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M0 20h40M0 40h40' stroke='rgba(120,95,70,0.10)' stroke-width='1' fill='none'/%3E%3C/svg%3E")`

const INK_TEXTURE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M0 0l32 32M32 0L0 32' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`

export const COURSE_BANNERS: readonly CourseBannerDefinition[] = [
  {
    key: 'deep-space',
    labelKey: 'banners.deepSpace',
    descKey: 'banners.deepSpaceDesc',
    defaultLabel: 'Espacio profundo',
    defaultDesc: 'Púrpuras oscuros y azules',
    backgroundColor: '#130f2e',
    accentColor: '#7c5cff',
    backgroundImage: `${SUBTLE_DOTS_SVG}, radial-gradient(circle at 18% 22%, rgba(124, 92, 255, 0.55) 0%, transparent 50%), radial-gradient(circle at 82% 75%, rgba(37, 99, 235, 0.50) 0%, transparent 55%), linear-gradient(135deg, #0d0924 0%, #1e1b4b 48%, #172554 100%)`,
  },
  {
    key: 'forest-notebook',
    labelKey: 'banners.forestNotebook',
    descKey: 'banners.forestNotebookDesc',
    defaultLabel: 'Cuaderno del bosque',
    defaultDesc: 'Verdes y tonos tierra',
    backgroundColor: '#142921',
    accentColor: '#10b981',
    backgroundImage: `${SUBTLE_GRID_SVG}, radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.42) 0%, transparent 52%), radial-gradient(circle at 80% 70%, rgba(180, 130, 75, 0.35) 0%, transparent 55%), linear-gradient(135deg, #0f291e 0%, #1b4332 52%, #3a2e21 100%)`,
  },
  {
    key: 'sunset-study',
    labelKey: 'banners.sunsetStudy',
    descKey: 'banners.sunsetStudyDesc',
    defaultLabel: 'Estudio al atardecer',
    defaultDesc: 'Naranjas y rosas',
    backgroundColor: '#3b152a',
    accentColor: '#f43f5e',
    backgroundImage: `${SUBTLE_DOTS_SVG}, radial-gradient(circle at 25% 25%, rgba(251, 146, 60, 0.55) 0%, transparent 50%), radial-gradient(circle at 78% 72%, rgba(244, 63, 94, 0.50) 0%, transparent 55%), linear-gradient(135deg, #431407 0%, #831843 52%, #4c1d95 100%)`,
  },
  {
    key: 'ocean-focus',
    labelKey: 'banners.oceanFocus',
    descKey: 'banners.oceanFocusDesc',
    defaultLabel: 'Enfoque oceánico',
    defaultDesc: 'Turquesas y azules',
    backgroundColor: '#0c2a36',
    accentColor: '#14b8a6',
    backgroundImage: `${SUBTLE_GRID_SVG}, radial-gradient(circle at 22% 28%, rgba(20, 184, 166, 0.50) 0%, transparent 50%), radial-gradient(circle at 80% 75%, rgba(14, 165, 233, 0.45) 0%, transparent 55%), linear-gradient(135deg, #082f49 0%, #0f766e 52%, #1e3a8a 100%)`,
  },
  {
    key: 'minimal-paper',
    labelKey: 'banners.minimalPaper',
    descKey: 'banners.minimalPaperDesc',
    defaultLabel: 'Papel minimalista',
    defaultDesc: 'Blancos cálidos y beiges',
    backgroundColor: '#e6dccf',
    accentColor: '#b48a60',
    backgroundImage: `${PAPER_LINES_SVG}, radial-gradient(circle at 20% 25%, rgba(255, 250, 240, 0.70) 0%, transparent 55%), radial-gradient(circle at 85% 80%, rgba(214, 193, 167, 0.65) 0%, transparent 55%), linear-gradient(135deg, #f5efe6 0%, #e8dccb 50%, #d5c3aa 100%)`,
  },
  {
    key: 'neon-lab',
    labelKey: 'banners.neonLab',
    descKey: 'banners.neonLabDesc',
    defaultLabel: 'Laboratorio neón',
    defaultDesc: 'Púrpuras eléctricos y cianes',
    backgroundColor: '#150d30',
    accentColor: '#06b6d4',
    backgroundImage: `${SUBTLE_GRID_SVG}, radial-gradient(circle at 18% 30%, rgba(168, 85, 247, 0.60) 0%, transparent 48%), radial-gradient(circle at 82% 68%, rgba(6, 182, 212, 0.58) 0%, transparent 50%), linear-gradient(135deg, #1a0b2e 0%, #2e1065 46%, #083344 100%)`,
  },
  {
    key: 'golden-hour',
    labelKey: 'banners.goldenHour',
    descKey: 'banners.goldenHourDesc',
    defaultLabel: 'Hora dorada',
    defaultDesc: 'Ámbares y dorados',
    backgroundColor: '#362109',
    accentColor: '#f59e0b',
    backgroundImage: `${SUBTLE_DOTS_SVG}, radial-gradient(circle at 24% 24%, rgba(251, 191, 36, 0.55) 0%, transparent 50%), radial-gradient(circle at 76% 78%, rgba(217, 119, 6, 0.50) 0%, transparent 55%), linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)`,
  },
  {
    key: 'rainy-window',
    labelKey: 'banners.rainyWindow',
    descKey: 'banners.rainyWindowDesc',
    defaultLabel: 'Ventana lluviosa',
    defaultDesc: 'Grises y azules suaves',
    backgroundColor: '#1e293b',
    accentColor: '#60a5fa',
    backgroundImage: `${INK_TEXTURE_SVG}, radial-gradient(circle at 25% 22%, rgba(148, 163, 184, 0.42) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(96, 165, 250, 0.38) 0%, transparent 55%), linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e3a5f 100%)`,
  },
  {
    key: 'cherry-blossom',
    labelKey: 'banners.cherryBlossom',
    descKey: 'banners.cherryBlossomDesc',
    defaultLabel: 'Flor de cerezo',
    defaultDesc: 'Rosas suaves y blancos',
    backgroundColor: '#4a1d34',
    accentColor: '#f472b6',
    backgroundImage: `${SUBTLE_DOTS_SVG}, radial-gradient(circle at 22% 28%, rgba(244, 114, 182, 0.52) 0%, transparent 50%), radial-gradient(circle at 80% 72%, rgba(253, 242, 248, 0.35) 0%, transparent 55%), linear-gradient(135deg, #500724 0%, #831843 48%, #9d174d 100%)`,
  },
  {
    key: 'midnight-ink',
    labelKey: 'banners.midnightInk',
    descKey: 'banners.midnightInkDesc',
    defaultLabel: 'Tinta de medianoche',
    defaultDesc: 'Casi negro con textura sutil',
    backgroundColor: '#090b10',
    accentColor: '#6366f1',
    backgroundImage: `${INK_TEXTURE_SVG}, radial-gradient(circle at 20% 25%, rgba(99, 102, 241, 0.25) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(45, 212, 191, 0.18) 0%, transparent 55%), linear-gradient(135deg, #090a0f 0%, #111827 52%, #18181b 100%)`,
  },
] as const

export const COURSE_BANNER_KEYS: readonly CourseBannerKey[] = COURSE_BANNERS.map((b) => b.key)

export function getCourseBannerByKey(
  bannerKey?: string | null,
): CourseBannerDefinition | null {
  if (!bannerKey) return null
  return COURSE_BANNERS.find((b) => b.key === bannerKey) ?? null
}

export function getRandomCourseBannerKey(): CourseBannerKey {
  const idx = Math.floor(Math.random() * COURSE_BANNERS.length)
  return COURSE_BANNERS[idx].key
}
