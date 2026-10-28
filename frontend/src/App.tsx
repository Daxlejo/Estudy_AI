import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import Home from './pages/Home'
import AppLayout from './components/layout/AppLayout'
import AppNotifications from './components/ui/AppNotifications'

// Entry routes (login, register, home) stay in the main chunk so first paint
// needs a single request. Everything else is split per route: the study,
// quiz and exam pages pull in react-markdown + remark-gfm, which are not
// needed until the user opens a session.
const Courses = lazy(() => import('./pages/Courses'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const CreateCourse = lazy(() => import('./pages/CreateCourse'))
const CourseProcessing = lazy(() => import('./pages/CourseProcessing'))
const LearningPath = lazy(() => import('./pages/LearningPath'))
const StudySession = lazy(() => import('./pages/StudySession'))
const Quiz = lazy(() => import('./pages/Quiz'))
const FinalExam = lazy(() => import('./pages/FinalExam'))
const OnboardingPage = lazy(() => import('./pages/Onboarding'))

/** Per-route boundary so layouts (TopBar) stay mounted while a chunk loads. */
function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[50vh] items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppNotifications />
        <Routes>
          {/* Rutas públicas de autenticación */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          {/* Rutas protegidas de la aplicación */}
          <Route element={<ProtectedRoute />}>
            {/* Flujo de onboarding a pantalla completa para nuevos usuarios */}
            <Route path="/onboarding" element={<Lazy><OnboardingPage /></Lazy>} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/cursos" element={<Lazy><Courses /></Lazy>} />
              <Route path="/cursos/nuevo" element={<Lazy><CreateCourse /></Lazy>} />
              <Route path="/cursos/:id/procesando" element={<Lazy><CourseProcessing /></Lazy>} />
              <Route path="/cursos/:id" element={<Lazy><CourseDetail /></Lazy>} />
              <Route path="/cursos/:id/ruta" element={<Lazy><LearningPath /></Lazy>} />
            </Route>

            {/* Modo de estudio y evaluación enfocado: sin TopBar global */}
            <Route path="/sesion/:id" element={<Lazy><StudySession /></Lazy>} />
            <Route path="/quiz/:id" element={<Lazy><Quiz /></Lazy>} />
            <Route path="/examen/:id" element={<Lazy><FinalExam /></Lazy>} />
            <Route path="/final-exam/:id" element={<Lazy><FinalExam /></Lazy>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
