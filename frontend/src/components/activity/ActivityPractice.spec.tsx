import test, { type TestContext } from 'node:test'
import assert from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  resolveMatchingMode,
  isMatchingContentSuitableForVisual,
  buildSequentialMatchingOptions,
  computeConnectionLinePath,
  areConnectionSegmentsEqual,
  type ConnectionSegment,
} from './matchingActivityUtils'
import { MatchingActivityView } from './MatchingActivityView'
import { ActivityContainer } from './ActivityContainer'
import { ClassifyActivityView } from './ClassifyActivityView'
import { evaluateClassify } from '../../services/activity.parser'
import type { ClassifyActivity } from '../../types/activity'
import { SessionPracticeBlock } from '../study-session/SessionPracticeBlock'
import { SessionIntroBlock } from '../study-session/SessionIntroBlock'
import { activityService } from '../../services/activity.service'
import { evaluateMatching } from '../../services/activity.parser'
import type { MatchingActivity } from '../../types/activity'
import type { PracticeExercise, StudySession } from '../../types/course'
import { I18nContext } from '../../i18n/i18nContext'
import { es } from '../../i18n/translations/es'
import { en } from '../../i18n/translations/en'
import type { I18nContextValue, TranslationParams } from '../../i18n/types'

function createI18nContext(lang: 'es' | 'en'): I18nContextValue {
  const dict = lang === 'en' ? en : es
  return {
    language: lang,
    setLanguage: () => { },
    toggleLanguage: () => { },
    t: (key: string, params?: TranslationParams) => {
      let text = dict[key] || es[key] || key
      if (params) {
        for (const [paramKey, paramVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal))
        }
      }
      return text
    },
    formatDate: (date) => String(date),
    formatNumber: (value) => String(value),
    formatDuration: (minutes) => `${minutes} min`,
  }
}

function makeMatchingActivity(pairCount: number, overrides: Partial<MatchingActivity> = {}): MatchingActivity {
  const pairs = Array.from({ length: pairCount }, (_, idx) => ({
    id: `p-${idx + 1}`,
    left: `Concepto ${idx + 1}`,
    right: `Definición precisa del concepto ${idx + 1}.`,
    explanation: `Explicación del par ${idx + 1}.`,
  }))

  return {
    id: `act-match-${pairCount}`,
    type: 'matching',
    title: 'Emparejamiento de Conceptos',
    instructions: 'Relaciona cada término con su definición.',
    context: 'Objetivo: Comprender las relaciones estructurales del módulo.',
    hint: 'Fíjate en la palabra clave de cada definición.',
    explanation: 'Cada término se asocia biunívocamente con su responsabilidad.',
    xpReward: 20,
    pairs,
    leftItems: pairs.map((p) => ({ id: p.id, text: p.left })),
    rightItems: [...pairs].reverse().map((p) => ({ id: p.id, text: p.right })),
    ...overrides,
  }
}

test('Adaptive Matching Mode Selection & Sequential Option Builder', async (t: TestContext) => {
  await t.test('selects visual mode for <= 6 pairs with concise text and desktop viewport', () => {
    const act3 = makeMatchingActivity(3)
    const act6 = makeMatchingActivity(6)

    assert.strictEqual(isMatchingContentSuitableForVisual(act3), true)
    assert.strictEqual(isMatchingContentSuitableForVisual(act6), true)
    assert.strictEqual(resolveMatchingMode(act3, 1280), 'visual')
    assert.strictEqual(resolveMatchingMode(act6, 768), 'visual')
  })

  await t.test('selects sequential mode when exercise has more than 6 pairs', () => {
    const act7 = makeMatchingActivity(7)
    assert.strictEqual(isMatchingContentSuitableForVisual(act7), false)
    assert.strictEqual(resolveMatchingMode(act7, 1440), 'sequential')
  })

  await t.test('selects sequential mode when viewport is narrow (< 768px)', () => {
    const act4 = makeMatchingActivity(4)
    assert.strictEqual(resolveMatchingMode(act4, 640), 'sequential')
    assert.strictEqual(resolveMatchingMode(act4, 375), 'sequential')
  })

  await t.test('selects sequential mode when card text length is too long for two columns', () => {
    const longRightText = 'A'.repeat(235)
    const actLong = makeMatchingActivity(3, {
      pairs: [
        { id: '1', left: 'Término 1', right: longRightText },
        { id: '2', left: 'Término 2', right: 'Definición corta' },
        { id: '3', left: 'Término 3', right: 'Otra definición corta' },
      ],
    })
    assert.strictEqual(isMatchingContentSuitableForVisual(actLong), false)
    assert.strictEqual(resolveMatchingMode(actLong, 1280), 'sequential')
  })

  await t.test('buildSequentialMatchingOptions preserves correct definition and caps options at 4 without inventing distractors', () => {
    const act8 = makeMatchingActivity(8)
    for (const leftItem of act8.leftItems) {
      const options = buildSequentialMatchingOptions(act8, leftItem.id)
      assert.strictEqual(options.length, 4)
      assert.ok(
        options.some((o) => o.id === leftItem.id),
        `Correct option for ${leftItem.id} must be present`,
      )
      for (const opt of options) {
        assert.ok(
          act8.rightItems.some((r) => r.id === opt.id && r.text === opt.text),
          'Every option must come strictly from existing exercise rightItems',
        )
      }
    }

    // Exercise with only 2 pairs returns only the 2 valid options
    const act2 = makeMatchingActivity(2)
    const options2 = buildSequentialMatchingOptions(act2, 'p-1')
    assert.strictEqual(options2.length, 2)
    assert.ok(options2.some((o) => o.id === 'p-1'))
    assert.ok(options2.some((o) => o.id === 'p-2'))
  })

  await t.test('computeConnectionLinePath and areConnectionSegmentsEqual handle SVG geometry deterministically', () => {
    const path = computeConnectionLinePath(100, 40, 200, 120)
    assert.ok(path.startsWith('M 100 40 C '))
    assert.ok(path.endsWith(', 200 120'))

    const segA: ConnectionSegment = {
      leftId: 'p-1',
      rightId: 'p-1',
      pairNumber: 1,
      x1: 100,
      y1: 40,
      x2: 200,
      y2: 120,
      path,
      status: 'linked',
    }
    const segClose: ConnectionSegment = { ...segA, x1: 100.2, y2: 120.3 }
    const segMoved: ConnectionSegment = { ...segA, y2: 145 }

    assert.strictEqual(areConnectionSegmentsEqual([segA], [segClose]), true)
    assert.strictEqual(areConnectionSegmentsEqual([segA], [segMoved]), false)
  })
})

test('MatchingActivityView — Visual SVG & Sequential Rendering', async (t: TestContext) => {
  const esCtx = createI18nContext('es')

  await t.test('renders visual mode with SVG connection paths and endpoint circles when pairs are linked', () => {
    const activity = makeMatchingActivity(3)
    const html = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <MatchingActivityView
          activity={activity}
          pairs={{ 'p-1': 'p-1', 'p-2': 'p-3' }}
          evaluation={null}
          viewportWidth={1280}
          onChangePairs={() => { }}
        />
      </I18nContext.Provider>,
    )

    assert.ok(html.includes('data-matching-mode="visual"'))
    assert.ok(html.includes('<svg'))
    assert.ok(html.includes('<path'))
    assert.ok(html.includes('<circle'))
    assert.ok(html.includes('2/3 vinculados'))
  })

  await t.test('hides correct solution on first failed attempt and reveals it only when showSolution is true', () => {
    const activity = makeMatchingActivity(2)
    const wrongPairs = { 'p-1': 'p-2', 'p-2': 'p-1' }
    const evaluation = evaluateMatching(activity, wrongPairs)

    const htmlAttempt1 = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <MatchingActivityView
          activity={activity}
          pairs={wrongPairs}
          evaluation={evaluation}
          showSolution={false}
          viewportWidth={1280}
          onChangePairs={() => { }}
        />
      </I18nContext.Provider>,
    )
    assert.ok(htmlAttempt1.includes('Revisar'))
    assert.ok(!htmlAttempt1.includes('Correspondencia correcta:'))

    const htmlExhausted = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <MatchingActivityView
          activity={activity}
          pairs={wrongPairs}
          evaluation={evaluation}
          showSolution={true}
          viewportWidth={1280}
          onChangePairs={() => { }}
        />
      </I18nContext.Provider>,
    )
    assert.ok(htmlExhausted.includes('Correspondencia correcta:'))
  })

  await t.test('renders sequential question mode on narrow viewports or > 6 pairs', () => {
    const activity7 = makeMatchingActivity(7)
    const html = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <MatchingActivityView
          activity={activity7}
          pairs={{ 'p-1': 'p-1' }}
          evaluation={null}
          viewportWidth={1280}
          onChangePairs={() => { }}
        />
      </I18nContext.Provider>,
    )

    assert.ok(html.includes('data-matching-mode="sequential"'))
    assert.ok(html.includes('Concepto 1 de 7'))
    // F-04: El feedback solo aparece después de handleVerify, no en el render inicial
    assert.ok(!html.includes('¡Asociación correcta!'))

    // F-04: Con evaluación suministrada tras verificación, el feedback se muestra adecuadamente
    const verifiedHtml = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <MatchingActivityView
          activity={activity7}
          pairs={{ 'p-1': 'p-1' }}
          evaluation={{
            isCorrect: true,
            scorePercent: 100,
            matchedCount: 7,
            totalPairs: 7,
            pairResults: [
              {
                leftId: 'p-1',
                rightId: 'p-1',
                isCorrect: true,
                correctRightId: 'p-1',
                leftText: 'Concepto 1',
                rightText: 'Definición 1',
                correctRightText: 'Definición 1',
              },
            ],
            feedback: '¡Excelente!',
            explanation: 'Explicación',
          }}
          viewportWidth={1280}
          onChangePairs={() => { }}
        />
      </I18nContext.Provider>,
    )
    assert.ok(verifiedHtml.includes('¡Asociación correcta!'))
  })
})

test('ActivityContainer, Hint Visibility, Objective Banner & Completion Enforcement', async (t: TestContext) => {
  const esCtx = createI18nContext('es')
  const enCtx = createI18nContext('en')

  await t.test('renders amber hint button, mission-briefing objective banner, and blocks advancement while incomplete', () => {
    const actId = `act-uncompleted-${Date.now()}`
    activityService.resetActivity(actId)
    const activity = makeMatchingActivity(3, { id: actId })

    const html = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <ActivityContainer
          activity={activity}
          phaseTitle="Fase 2: Práctica Guiada"
          stepNumber={3}
          continueButtonLabel="Continuar al Desafío aplicado"
          viewportWidth={1280}
          onContinue={() => { }}
          onBack={() => { }}
        />
      </I18nContext.Provider>,
    )

    // Amber hint button with #FACC15 and "Ver pista"
    assert.ok(html.includes('bg-[#FACC15]'))
    assert.ok(html.includes('Ver pista'))

    // Objective mission-briefing banner
    assert.ok(html.includes('Objetivo de la sesión'))
    assert.ok(html.includes('Objetivo: Comprender las relaciones estructurales del módulo.'))

    // Verify solution prominent button & disabled Continue with visible explanation
    assert.ok(html.includes('Verificar solución'))
    assert.ok(html.includes('Completa el ejercicio para continuar'))
    assert.ok(html.includes(`aria-describedby="continue-req-${actId}"`))
    assert.ok(html.includes('Volver al bloque anterior'))
  })

  await t.test('distinguishes between mastery completion (with XP) and solution-review completion (0 XP) after exhausting attempts', () => {
    const actId = `act-review-flow-${Date.now()}`
    activityService.resetActivity(actId)

    // Attempt 1 fails
    const att1 = activityService.recordAttempt(actId, false, 33, 20, false)
    assert.strictEqual(att1.state.completed, false)
    assert.strictEqual(att1.xpAwarded, 0)

    // Attempt 2 fails (exhausts attempts)
    const att2 = activityService.recordAttempt(actId, false, 33, 20, true)
    assert.strictEqual(att2.state.completed, false)
    assert.strictEqual(att2.xpAwarded, 0)

    // Student acknowledges revealed solution -> unlocks completion without counting as correct/XP
    const reviewedState = activityService.acknowledgeSolution(actId)
    assert.strictEqual(reviewedState.completed, true)
    assert.strictEqual(reviewedState.completedByReview, true)
    assert.strictEqual(reviewedState.earnedXp, 0)
    assert.strictEqual(reviewedState.attemptsCount, 2)

    // Rendering ActivityContainer with reviewed state unlocks Continue button and shows review badge
    const activity = makeMatchingActivity(3, { id: actId })
    const htmlReviewed = renderToStaticMarkup(
      <I18nContext.Provider value={enCtx}>
        <ActivityContainer
          activity={activity}
          phaseTitle="Phase 2: Guided Practice"
          stepNumber={3}
          continueButtonLabel="Continue to Challenge"
          viewportWidth={1280}
          onContinue={() => { }}
          onBack={() => { }}
        />
      </I18nContext.Provider>,
    )

    assert.ok(htmlReviewed.includes('Solution reviewed · Ready to advance'))
    assert.ok(!htmlReviewed.includes('Complete the exercise to continue'))

    // If student later retries and solves correctly, XP is awarded once and completedByReview is cleared
    const att3 = activityService.recordAttempt(actId, true, 100, 20, true)
    assert.strictEqual(att3.state.completed, true)
    assert.strictEqual(att3.state.completedByReview, undefined)
    assert.strictEqual(att3.xpAwarded, 20)
    assert.strictEqual(att3.state.earnedXp, 20)
  })

  await t.test('SessionPracticeBlock fallback and SessionIntroBlock render mission objective and enforce completion gating', () => {
    const fallbackExercise: PracticeExercise = {
      id: 'ex-fallback-1',
      prompt: 'Analiza el siguiente caso de uso.',
      context: 'Objetivo: Aplicar encapsulamiento.',
      options: [
        { id: 'o1', text: 'Opción correcta', isCorrect: true, feedback: 'Bien hecho.' },
        { id: 'o2', text: 'Opción incorrecta', isCorrect: false, feedback: 'Revisa el concepto.' },
      ],
    }

    const practiceHtml = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <SessionPracticeBlock
          exercise={fallbackExercise}
          blockNumber={3}
          stepNumber={3}
          phaseTitle="Fase 2: Práctica Guiada"
          continueButtonLabel="Continuar al Desafío"
          onContinue={() => { }}
          onBack={() => { }}
        />
      </I18nContext.Provider>,
    )

    assert.ok(practiceHtml.includes('Completa el ejercicio para continuar'))
    assert.ok(practiceHtml.includes('Verificar solución'))

    const mockSession: StudySession = {
      id: 'sess-1',
      courseId: 'course-1',
      courseTitle: 'Arquitectura',
      sessionNumber: 1,
      totalSessions: 3,
      title: 'Sesión 1',
      learningObjective: 'Diseñar componentes desacoplados y mantenibles.',
      durationMinutes: 15,
      xpReward: 50,
      introduction: {
        title: 'Bienvenida',
        content: 'Contenido introductorio.',
        keyTakeaway: 'El bajo acoplamiento facilita la evolución.',
      },
      concepts: [],
      guidedPractice: fallbackExercise,
      challenge: fallbackExercise,
      quizId: 'quiz-1',
    }

    const introHtml = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <SessionIntroBlock session={mockSession} onContinue={() => { }} />
      </I18nContext.Provider>,
    )

    assert.ok(introHtml.includes('Objetivo de la sesión'))
    assert.ok(introHtml.includes('Diseñar componentes desacoplados y mantenibles.'))
  })
})

test('R2 & R3 Regressions — Guided Practice vs Applied Challenge Component Behavior', async (t: TestContext) => {
  const esCtx = createI18nContext('es')

  const sampleClassify: ClassifyActivity = {
    id: 'act-classify-test',
    type: 'classify' as const,
    title: 'Clasificación de Arquitecturas',
    instructions: 'Asigna cada patrón a su categoría arquitectónica',
    categories: ['Monolítico', 'Distribuido'],
    items: [
      { label: 'Event-Driven', correctCategory: 'Distribuido' },
      { label: 'MVC clásico', correctCategory: 'Monolítico' },
    ],
    hint: 'Piensa en si hay múltiples procesos independientes o uno solo.',
    explanation: 'Event-driven distribuye la carga a través de un bus de eventos.',
    xpReward: 25,
  }

  await t.test('Guided Practice renders hint toggle button and pedagogical hint', () => {
    activityService.resetActivity('act-classify-test')
    const htmlGP = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <ActivityContainer
          activity={{ ...sampleClassify, phase: 'guidedPractice' }}
          phaseTitle="Fase 2: Práctica Guiada"
          stepNumber={3}
          continueButtonLabel="Continuar al Desafío"
          viewportWidth={1280}
          onContinue={() => {}}
          onBack={() => {}}
        />
      </I18nContext.Provider>
    )

    // Guided Practice has the amber hint button
    assert.ok(htmlGP.includes('Ver pista'), 'Guided Practice must offer hint button')
    assert.ok(htmlGP.includes('bg-[#FACC15]'), 'Hint button must have amber style')
    // Must NOT contain raw JSON syntax
    assert.ok(!htmlGP.includes('{"type":"classify"'), 'Must not render raw serialized JSON')
    assert.ok(htmlGP.includes('Event-Driven'), 'Must render interactive item')
    assert.ok(htmlGP.includes('MVC clásico'), 'Must render interactive item')
  })

  await t.test('Applied Challenge withholds hint button during attempt and reveals feedback after verification', () => {
    const challengeActId = 'act-challenge-test-1'
    activityService.resetActivity(challengeActId)

    // In Challenge (stepNumber = 4 or phase = 'challenge'), hint button is withheld during attempt
    const htmlCH = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <ActivityContainer
          activity={{ ...sampleClassify, id: challengeActId, phase: 'challenge' }}
          phaseTitle="Fase 3: Desafío Aplicado"
          stepNumber={4}
          continueButtonLabel="Continuar al Mini-Quiz"
          viewportWidth={1280}
          onContinue={() => {}}
          onBack={() => {}}
        />
      </I18nContext.Provider>
    )

    // Challenge must NOT offer hint button during attempt
    assert.ok(!htmlCH.includes('Ver pista'), 'Challenge must withhold hint button during attempt')
    assert.ok(!htmlCH.includes('bg-[#FACC15]'), 'No amber hint button in challenge')
    // Must NOT contain raw JSON syntax
    assert.ok(!htmlCH.includes('{"type":"classify"'), 'Must not render raw JSON')
    // Must render prominent challenge submit button and gated continue
    assert.ok(htmlCH.includes('Enviar y calificar desafío'), 'Must render challenge submit button')
    assert.ok(htmlCH.includes('Completa el ejercicio para continuar'), 'Must gate continue button')

    // Simulate completion in activity service
    activityService.recordAttempt(challengeActId, true, 100, 25, false)
    const htmlCompleted = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <ActivityContainer
          activity={{ ...sampleClassify, id: challengeActId, phase: 'challenge' }}
          phaseTitle="Fase 3: Desafío Aplicado"
          stepNumber={4}
          continueButtonLabel="Continuar al Mini-Quiz"
          viewportWidth={1280}
          onContinue={() => {}}
          onBack={() => {}}
        />
      </I18nContext.Provider>
    )

    // Completed challenge displays success badge and unlocks progression
    assert.ok(htmlCompleted.includes('Actividad completada con éxito'), 'Completed challenge shows success')
    assert.ok(!htmlCompleted.includes('Completa el ejercicio para continuar'), 'Unlocked continue button')

    // Test ClassifyActivityView post-submission feedback directly (incorrect response, expected answer, explanation)
    const evaluated = evaluateClassify(sampleClassify, {
      'Event-Driven': 'Monolítico', // incorrect
      'MVC clásico': 'Monolítico', // correct
    })
    assert.strictEqual(evaluated.isCorrect, false)
    assert.strictEqual(evaluated.scorePercent, 50)
    assert.strictEqual(evaluated.itemResults[0].isCorrect, false)
    assert.strictEqual(evaluated.itemResults[0].correctCategory, 'Distribuido')

    const htmlEvaluated = renderToStaticMarkup(
      <I18nContext.Provider value={esCtx}>
        <ClassifyActivityView
          activity={sampleClassify}
          itemAssignments={{ 'Event-Driven': 'Monolítico', 'MVC clásico': 'Monolítico' }}
          evaluation={evaluated}
          showSolution={true}
          onChangeAssignments={() => {}}
        />
      </I18nContext.Provider>
    )

    assert.ok(htmlEvaluated.includes('Distribuido'), 'Reveals expected category for incorrect item')
    assert.strictEqual(evaluated.explanation, sampleClassify.explanation, 'Evaluation preserves technical explanation')
  })
})
