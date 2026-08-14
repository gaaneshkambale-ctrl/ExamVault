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
import AdminResults from '../pages/admin/AdminResults';
import AdminReports from '../pages/admin/AdminReports';
import AdminSettings from '../pages/admin/AdminSettings';
import ExamReportDetails from '../pages/admin/ExamReportDetails';
import StudentDashboard from '../pages/student/StudentDashboard';
import MyExams from '../pages/student/MyExams';
import StudentExamDetails from '../pages/student/ExamDetails';
import TakeExam from '../pages/student/TakeExam';
import MyResults from '../pages/student/MyResults';
import ResultDetails from '../pages/student/ResultDetails';
import MyNotifications from '../pages/student/MyNotifications';
import NotificationDetails from '../pages/student/NotificationDetails';
import NotificationSettings from '../pages/student/NotificationSettings';
import AdminNotifications from '../pages/admin/AdminNotifications';
import AdminNotificationDetails from '../pages/admin/AdminNotificationDetails';
import CreateNotification from '../pages/admin/CreateNotification';
import NotificationHistory from '../pages/admin/NotificationHistory';
import NotificationBatchDetails from '../pages/admin/NotificationBatchDetails';
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
        path="/admin/results"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/:examId"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamReportDetails />
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
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <MyResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results/:examId"
        element={
          <ProtectedRoute>
            <ResultDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/settings"
        element={
          <ProtectedRoute>
            <NotificationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/:id"
        element={
          <ProtectedRoute>
            <NotificationDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <MyNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications/create"
        element={
          <ProtectedRoute roles={['Admin']}>
            <CreateNotification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications/history/:batchId"
        element={
          <ProtectedRoute roles={['Admin']}>
            <NotificationBatchDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications/history"
        element={
          <ProtectedRoute roles={['Admin']}>
            <NotificationHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications/:id"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminNotificationDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminSettings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
