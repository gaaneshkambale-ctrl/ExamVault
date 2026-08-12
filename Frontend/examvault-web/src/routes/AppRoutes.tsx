import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageExams from '../pages/admin/ManageExams';
import CreateExam from '../pages/admin/CreateExam';
import ExamDetails from '../pages/admin/ExamDetails';
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
          <ProtectedRoute>
            <ManageExams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/create"
        element={
          <ProtectedRoute>
            <CreateExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:id"
        element={
          <ProtectedRoute>
            <ExamDetails />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
