import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageUsers from '../pages/admin/ManageUsers';
import CreateUser from '../pages/admin/CreateUser';
import EditUser from '../pages/admin/EditUser';
import UserDetails from '../pages/admin/UserDetails';
import ResetPassword from '../pages/admin/ResetPassword';
import RolesPermissions from '../pages/admin/RolesPermissions';
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
import ManageGroups from '../pages/admin/ManageGroups';
import GroupDetails from '../pages/admin/GroupDetails';
import Assignments from '../pages/admin/Assignments';
import AssignExam from '../pages/admin/AssignExam';
import StudentDashboard from '../pages/student/StudentDashboard';
import MyExams from '../pages/student/MyExams';
import StudentExamDetails from '../pages/student/ExamDetails';
import TakeExam from '../pages/student/TakeExam';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />
      <Route path="/register" element={<Home />} />
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
        path="/admin/users"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/create"
        element={
          <ProtectedRoute roles={['Admin']}>
            <CreateUser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/roles"
        element={
          <ProtectedRoute roles={['Admin']}>
            <RolesPermissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id/edit"
        element={
          <ProtectedRoute roles={['Admin']}>
            <EditUser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id/reset-password"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ResetPassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <ProtectedRoute roles={['Admin']}>
            <UserDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/groups"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ManageGroups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/groups/:id"
        element={
          <ProtectedRoute roles={['Admin']}>
            <GroupDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute roles={['Admin']}>
            <Assignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments/new"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AssignExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments/:id/edit"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AssignExam />
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
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams"
        element={
          <ProtectedRoute>
            <MyExams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams/:id"
        element={
          <ProtectedRoute>
            <StudentExamDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams/:id/take"
        element={
          <ProtectedRoute>
            <TakeExam />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
