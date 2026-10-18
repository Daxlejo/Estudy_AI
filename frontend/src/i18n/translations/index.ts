import { es } from './es.ts'
import { en } from './en.ts'
import type { Language } from '../types.ts'

export { es, en }
export const translations: Record<Language, Record<string, string>> = { es, en }
