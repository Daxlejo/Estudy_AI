import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import Home from './pages/Home'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import CreateCourse from './pages/CreateCourse'
import CourseProcessing from './pages/CourseProcessing'
import LearningPath from './pages/LearningPath'
import StudySession from './pages/StudySession'
import Quiz from './pages/Quiz'
import FinalExam from './pages/FinalExam'
import OnboardingPage from './pages/Onboarding'
import AppLayout from './components/layout/AppLayout'
import AppNotifications from './components/ui/AppNotifications'

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
            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/cursos" element={<Courses />} />
              <Route path="/cursos/nuevo" element={<CreateCourse />} />
              <Route path="/cursos/:id/procesando" element={<CourseProcessing />} />
              <Route path="/cursos/:id" element={<CourseDetail />} />
              <Route path="/cursos/:id/ruta" element={<LearningPath />} />
            </Route>

            {/* Modo de estudio y evaluación enfocado: sin TopBar global */}
            <Route path="/sesion/:id" element={<StudySession />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/examen/:id" element={<FinalExam />} />
            <Route path="/final-exam/:id" element={<FinalExam />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App