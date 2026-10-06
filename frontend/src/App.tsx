import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import CreateCourse from './pages/CreateCourse'
import CourseProcessing from './pages/CourseProcessing'
import LearningPath from './pages/LearningPath'
import StudySession from './pages/StudySession'
import Quiz from './pages/Quiz'
import FinalExam from './pages/FinalExam'
import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App