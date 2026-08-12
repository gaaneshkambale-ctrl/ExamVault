import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageExams from '../pages/admin/ManageExams';
import CreateExam from '../pages/admin/CreateExam';
import ExamDetails from '../pages/admin/ExamDetails';
import EditExam from '../pages/admin/EditExam';
import QuestionBank from '../pages/admin/QuestionBank';
import CreateQuestion from '../pages/admin/CreateQuestion';
import QuestionDetails from '../pages/admin/QuestionDetails';
import EditQuestion from '../pages/admin/EditQuestion';
import AiGenerateQuestion from '../pages/admin/AiGenerateQuestion';
import AiGeneratedQuestionsPreview from '../pages/admin/AiGeneratedQuestionsPreview';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ManageExams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/create"
        element={
          <ProtectedRoute roles={['Admin']}>
            <CreateExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:id/edit"
        element={
          <ProtectedRoute roles={['Admin']}>
            <EditExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:id"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions"
        element={
          <ProtectedRoute roles={['Admin']}>
            <QuestionBank />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/questions/create"
        element={
          <ProtectedRoute roles={['Admin']}>
            <CreateQuestion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/questions/ai-generate"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AiGenerateQuestion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/ai-generate"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AiGenerateQuestion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/ai-generate/preview"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AiGeneratedQuestionsPreview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/:id"
        element={
          <ProtectedRoute roles={['Admin']}>
            <QuestionDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/:id/edit"
        element={
          <ProtectedRoute roles={['Admin']}>
            <EditQuestion />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
