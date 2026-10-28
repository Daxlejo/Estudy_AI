import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconLanguage,
  IconUpload,
  IconSparkles,
  IconLockOpen,
  IconFlame,
  IconSun,
  IconMoon,
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconRocket,
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../theme/themeContext'
import { useTranslation, DEFAULT_LANGUAGE, type Language } from '../../i18n'
import type { Theme } from '../../theme/theme'
import logo from '../../assets/images/logo.svg'
import logoLight from '../../assets/images/logo-light.svg'

type OnboardingStep = 1 | 2 | 3

interface TutorialSlide {
  id: number
  icon: React.ComponentType<{ className?: string }>
  headline: string
  sentence: string
  accentClass: string
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const { completeOnboarding } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, setLanguage } = useTranslation()

  const [step, setStep] = useState<OnboardingStep>(1)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(DEFAULT_LANGUAGE)
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme)
  const [slideIndex, setSlideIndex] = useState<number>(0)

  const slides: TutorialSlide[] = [
    {
      id: 1,
      icon: IconUpload,
      headline: t('onboarding.slide1Title'),
      sentence: t('onboarding.slide1Desc'),
      accentClass: 'border-primary/30 bg-primary/10 text-primary',
    },
    {
      id: 2,
      icon: IconSparkles,
      headline: t('onboarding.slide2Title'),
      sentence: t('onboarding.slide2Desc'),
      accentClass: 'border-secondary/30 bg-secondary/10 text-secondary',
    },
    {
      id: 3,
      icon: IconLockOpen,
      headline: t('onboarding.slide3Title'),
      sentence: t('onboarding.slide3Desc'),
      accentClass: 'border-primary/30 bg-primary/10 text-primary',
    },
    {
      id: 4,
      icon: IconFlame,
      headline: t('onboarding.slide4Title'),
      sentence: t('onboarding.slide4Desc'),
      accentClass: 'border-tertiary/30 bg-tertiary/10 text-tertiary',
    },
  ]

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLanguage(lang)
    setLanguage(lang)
  }

  const handleSelectTheme = (nextTheme: Theme) => {
    setSelectedTheme(nextTheme)
    setTheme(nextTheme)
  }

  const handleFinish = () => {
    setLanguage(selectedLanguage)
    setTheme(selectedTheme)
    completeOnboarding({
      language: selectedLanguage,
      theme: selectedTheme,
    })
    navigate('/', { replace: true })
  }

  const currentSlide = slides[slideIndex] ?? slides[0]
  const CurrentSlideIcon = currentSlide.icon

  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-background px-4 py-8 text-text-primary transition-colors duration-200 md:px-8 md:py-12">
      {/* Cabecera minimalista de progreso */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={theme === 'dark' ? logo : logoLight}
            alt="EstudyAI"
            className="h-9 w-auto select-none"
            draggable={false}
          />
        </div>

        <div className="flex items-center gap-2" aria-label={t('onboarding.stepIndicator', { current: step, total: 3 })}>
          {([1, 2, 3] as const).map((s) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all duration-200 ${
                step === s
                  ? 'w-8 bg-primary'
                  : step > s
                    ? 'w-3 bg-secondary'
                    : 'w-2 bg-border'
              }`}
            />
          ))}
          <span className="ml-2 text-xs font-semibold text-text-secondary">
            {t('onboarding.stepIndicator', { current: step, total: 3 })}
          </span>
        </div>
      </header>

      {/* Contenedor central de los 3 pasos */}
      <main className="mx-auto my-auto flex w-full max-w-3xl flex-col items-center justify-center py-8">
        {/* PASO 1: Selección de idioma */}
        {step === 1 && (
          <section
            aria-labelledby="onboarding-lang-headline"
            className="w-full rounded-3xl border border-border bg-surface p-6 shadow-xl transition-all duration-200 md:p-10"
          >
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <IconLanguage className="size-7" />
              </div>

              <h1
                id="onboarding-lang-headline"
                className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl"
              >
                {t('onboarding.langHeadline')}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
                {t('onboarding.langSubtext')}
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label={t('onboarding.langHeadline')}
              className="mt-8 grid gap-4 sm:grid-cols-2"
            >
              {/* Tarjeta: Español */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedLanguage === 'es'}
                onClick={() => handleSelectLanguage('es')}
                className={`group relative flex cursor-pointer flex-col items-start justify-between rounded-2xl border-2 p-6 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  selectedLanguage === 'es'
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-background/60 hover:border-primary/40 hover:bg-surface-high/50'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex size-14 items-center justify-center rounded-2xl font-heading text-lg font-bold transition-colors ${
                      selectedLanguage === 'es'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-high text-text-primary'
                    }`}
                  >
                    ES
                  </div>
                  {selectedLanguage === 'es' && (
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary">
                      <IconCheck className="size-4" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xl font-bold text-text-primary">
                      {t('language.spanish')}
                    </span>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {t('common.default')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-text-secondary md:text-sm">
                    {t('onboarding.langEsDesc')}
                  </p>
                </div>
              </button>

              {/* Tarjeta: English */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedLanguage === 'en'}
                onClick={() => handleSelectLanguage('en')}
                className={`group relative flex cursor-pointer flex-col items-start justify-between rounded-2xl border-2 p-6 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  selectedLanguage === 'en'
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-background/60 hover:border-primary/40 hover:bg-surface-high/50'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex size-14 items-center justify-center rounded-2xl font-heading text-lg font-bold transition-colors ${
                      selectedLanguage === 'en'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-high text-text-primary'
                    }`}
                  >
                    EN
                  </div>
                  {selectedLanguage === 'en' && (
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary">
                      <IconCheck className="size-4" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <span className="font-heading text-xl font-bold text-text-primary">
                    {t('language.english')}
                  </span>
                  <p className="mt-1.5 text-xs text-text-secondary md:text-sm">
                    {t('onboarding.langEnDesc')}
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSlideIndex(0)
                  setStep(2)
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-heading text-sm font-bold text-on-primary shadow-md transition-all duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span>{t('onboarding.next')}</span>
                <IconArrowRight className="size-4" />
              </button>
            </div>
          </section>
        )}

        {/* PASO 2: Mini tutorial (4 diapositivas) */}
        {step === 2 && (
          <section
            aria-labelledby="onboarding-tutorial-headline"
            className="w-full rounded-3xl border border-border bg-surface p-6 shadow-xl transition-all duration-200 md:p-10"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-border bg-surface-high px-3 py-1 text-xs font-semibold text-text-secondary">
                {slideIndex + 1} / {slides.length}
              </span>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t('onboarding.skip')}
              </button>
            </div>

            <div className="my-10 flex flex-col items-center text-center">
              <div
                className={`mb-6 flex size-20 items-center justify-center rounded-3xl border shadow-sm transition-all duration-200 ${currentSlide.accentClass}`}
              >
                <CurrentSlideIcon className="size-10" />
              </div>

              <h1
                id="onboarding-tutorial-headline"
                className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl"
              >
                {currentSlide.headline}
              </h1>

              <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-secondary md:text-base">
                {currentSlide.sentence}
              </p>
            </div>

            {/* Indicador de puntos (step dots) */}
            <div
              className="mb-8 flex items-center justify-center gap-2"
              role="tablist"
              aria-label={t('onboarding.tutorialSlidesAria')}
            >
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={slideIndex === idx}
                  aria-label={`${idx + 1}: ${s.headline}`}
                  onClick={() => setSlideIndex(idx)}
                  className={`h-2.5 cursor-pointer rounded-full transition-all duration-200 ${
                    slideIndex === idx
                      ? 'w-8 bg-primary'
                      : 'w-2.5 bg-border hover:bg-text-secondary/50'
                  }`}
                />
              ))}
            </div>

            {/* Navegación Atrás / Siguiente */}
            <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-6">
              <button
                type="button"
                onClick={() => {
                  if (slideIndex === 0) {
                    setStep(1)
                  } else {
                    setSlideIndex((prev) => prev - 1)
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <IconArrowLeft className="size-4" />
                <span>{t('onboarding.back')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (slideIndex < slides.length - 1) {
                    setSlideIndex((prev) => prev + 1)
                  } else {
                    setStep(3)
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-7 py-3 font-heading text-sm font-bold text-on-primary shadow-md transition-all duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span>{t('onboarding.next')}</span>
                <IconArrowRight className="size-4" />
              </button>
            </div>
          </section>
        )}

        {/* PASO 3: Selección de tema visual */}
        {step === 3 && (
          <section
            aria-labelledby="onboarding-theme-headline"
            className="w-full rounded-3xl border border-border bg-surface p-6 shadow-xl transition-all duration-200 md:p-10"
          >
            <div className="mx-auto max-w-xl text-center">
              <h1
                id="onboarding-theme-headline"
                className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl"
              >
                {t('onboarding.themeHeadline')}
              </h1>
              <p className="mt-2 text-sm text-text-secondary md:text-base">
                {t('onboarding.themeSubtext')}
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label={t('onboarding.themeHeadline')}
              className="mt-8 grid gap-4 sm:grid-cols-2"
            >
              {/* Tarjeta: Claro (Clean Tech) */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedTheme === 'light'}
                onClick={() => handleSelectTheme('light')}
                className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-6 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  selectedTheme === 'light'
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-background/60 hover:border-primary/40 hover:bg-surface-high/50'
                }`}
              >
                {/* Mini vista previa paleta Clean Tech */}
                <div className="mb-5 w-full overflow-hidden rounded-xl border border-[#d9d7e2] bg-[#f3f2f7] p-3 shadow-inner">
                  <div className="flex items-center justify-between rounded-lg bg-[#ffffff] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-[#6f63e8]" />
                      <span className="h-2 w-16 rounded-full bg-[#24232a]/80" />
                    </div>
                    <span className="h-2 w-8 rounded-full bg-[#22aaa2]" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <span className="h-6 rounded-md bg-[#ffffff]" />
                    <span className="h-6 rounded-md bg-[#e9e7f0]" />
                    <span className="h-6 rounded-md bg-[#ecebfd]" />
                  </div>
                </div>

                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl ${
                        selectedTheme === 'light'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-high text-text-secondary'
                      }`}
                    >
                      <IconSun className="size-5" />
                    </div>
                    <div>
                      <span className="block font-heading text-lg font-bold text-text-primary">
                        {t('theme.light')}
                      </span>
                      <span className="block text-xs font-semibold text-primary">
                        Clean Tech
                      </span>
                    </div>
                  </div>

                  {selectedTheme === 'light' && (
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary">
                      <IconCheck className="size-4" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-text-secondary">
                  {t('onboarding.themeLightDesc')}
                </p>
              </button>

              {/* Tarjeta: Oscuro (Deep Space) */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedTheme === 'dark'}
                onClick={() => handleSelectTheme('dark')}
                className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-6 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  selectedTheme === 'dark'
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-background/60 hover:border-primary/40 hover:bg-surface-high/50'
                }`}
              >
                {/* Mini vista previa paleta Deep Space */}
                <div className="mb-5 w-full overflow-hidden rounded-xl border border-[#474554] bg-[#131317] p-3 shadow-inner">
                  <div className="flex items-center justify-between rounded-lg bg-[#1f1f23] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-[#c6bfff]" />
                      <span className="h-2 w-16 rounded-full bg-[#e4e1e7]/80" />
                    </div>
                    <span className="h-2 w-8 rounded-full bg-[#5dd9d0]" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <span className="h-6 rounded-md bg-[#1f1f23]" />
                    <span className="h-6 rounded-md bg-[#2a292e]" />
                    <span className="h-6 rounded-md bg-[#1e1c38]" />
                  </div>
                </div>

                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl ${
                        selectedTheme === 'dark'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-high text-text-secondary'
                      }`}
                    >
                      <IconMoon className="size-5" />
                    </div>
                    <div>
                      <span className="block font-heading text-lg font-bold text-text-primary">
                        {t('theme.dark')}
                      </span>
                      <span className="block text-xs font-semibold text-secondary">
                        Deep Space
                      </span>
                    </div>
                  </div>

                  {selectedTheme === 'dark' && (
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary">
                      <IconCheck className="size-4" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-text-secondary">
                  {t('onboarding.themeDarkDesc')}
                </p>
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-border/70 pt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <IconArrowLeft className="size-4" />
                <span>{t('onboarding.back')}</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-lg transition-all duration-150 hover:scale-[1.02] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <IconRocket className="size-4" />
                <span>{t('onboarding.start')}</span>
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto w-full max-w-3xl text-center text-xs text-text-secondary">
        EstudyAI
      </footer>
    </div>
  )
}

export default OnboardingPage
