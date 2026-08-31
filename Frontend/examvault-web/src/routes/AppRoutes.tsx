import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Pricing from '../pages/Pricing';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Profile from '../pages/Profile';
import ChangePassword from '../pages/ChangePassword';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageUsers from '../pages/admin/ManageUsers';
import CreateUser from '../pages/admin/CreateUser';
import ImportUsers from '../pages/admin/ImportUsers';
import EditUser from '../pages/admin/EditUser';
import UserDetails from '../pages/admin/UserDetails';
import ResetPassword from '../pages/admin/ResetPassword';
import RolesPermissions from '../pages/admin/RolesPermissions';
import ManageExams from '../pages/admin/ManageExams';
import ManageExamTypes from '../pages/admin/ManageExamTypes';
import CreateExam from '../pages/admin/CreateExam';
import ExamDetails from '../pages/admin/ExamDetails';
import EditExam from '../pages/admin/EditExam';
import ManageSections from '../pages/admin/ManageSections';
import SectionForm from '../pages/admin/SectionForm';
import SectionDetails from '../pages/admin/SectionDetails';
import ReorderSections from '../pages/admin/ReorderSections';
import ExamWizardSections from '../pages/admin/ExamWizardSections';
import ExamWizardConfiguration from '../pages/admin/ExamWizardConfiguration';
import ExamWizardReview from '../pages/admin/ExamWizardReview';
import QuestionDetails from '../pages/admin/QuestionDetails';
import EditQuestion from '../pages/admin/EditQuestion';
import AiGenerateQuestion from '../pages/admin/AiGenerateQuestion';
import AiGeneratedQuestionsPreview from '../pages/admin/AiGeneratedQuestionsPreview';
import GradeAnswers from '../pages/admin/GradeAnswers';
import ManageGroups from '../pages/admin/ManageGroups';
import GroupDetails from '../pages/admin/GroupDetails';
import AssignExam from '../pages/admin/AssignExam';
import ActiveExams from '../pages/admin/liveMonitoring/ActiveExams';
import StudentAttempts from '../pages/admin/liveMonitoring/StudentAttempts';
import SecurityViolations from '../pages/admin/liveMonitoring/SecurityViolations';
import Proctoring from '../pages/admin/liveMonitoring/Proctoring';
import ExamResults from '../pages/admin/ExamResults';
import StudentResults from '../pages/admin/StudentResults';
import ResultAnalytics from '../pages/admin/ResultAnalytics';
import PublishResults from '../pages/admin/PublishResults';
import AdminReports from '../pages/admin/AdminReports';
import StudentReports from '../pages/admin/StudentReports';
import PerformanceReports from '../pages/admin/PerformanceReports';
import AuditReports from '../pages/admin/AuditReports';
import ExamTypeWiseReport from '../pages/admin/ExamTypeWiseReport';
import AdminSettings from '../pages/admin/AdminSettings';
import GeneralSettingsPage from '../pages/admin/settings/GeneralSettingsPage';
import ExamSettingsPage from '../pages/admin/settings/ExamSettingsPage';
import SecuritySettingsPage from '../pages/admin/settings/SecuritySettingsPage';
import ProctoringSettingsPage from '../pages/admin/settings/ProctoringSettingsPage';
import NotificationSettingsPage from '../pages/admin/settings/NotificationSettingsPage';
import SystemSettingsPage from '../pages/admin/settings/SystemSettingsPage';
import ExamReportDetails from '../pages/admin/ExamReportDetails';
import StudentDashboard from '../pages/student/StudentDashboard';
import MyExams from '../pages/student/MyExams';
import StudentExamDetails from '../pages/student/ExamDetails';
import TakeExam from '../pages/student/TakeExam';
import MyResults from '../pages/student/MyResults';
import MyCertificates from '../pages/student/MyCertificates';
import CertificateDetails from '../pages/student/CertificateDetails';
import ResultDetails from '../pages/student/ResultDetails';
import MyNotifications from '../pages/student/MyNotifications';
import NotificationDetails from '../pages/student/NotificationDetails';
import SettingsPage from '../pages/student/SettingsPage';
import NotificationSettings from '../pages/student/NotificationSettings';
import AdminNotifications from '../pages/admin/AdminNotifications';
import AdminNotificationDetails from '../pages/admin/AdminNotificationDetails';
import CreateNotification from '../pages/admin/CreateNotification';
import NotificationHistory from '../pages/admin/NotificationHistory';
import NotificationBatchDetails from '../pages/admin/NotificationBatchDetails';
import NotificationTemplates from '../pages/admin/NotificationTemplates';
import ProtectedRoute from '../components/ProtectedRoute';
import ManageTenants from '../pages/platform/ManageTenants';
import CreateOrganization from '../pages/platform/CreateOrganization';
import OrganizationDetails from '../pages/platform/OrganizationDetails';
import AllUsers from '../pages/platform/AllUsers';
import SubscriptionPlans from '../pages/platform/SubscriptionPlans';
import OrganizationsAndPlans from '../pages/platform/OrganizationsAndPlans';
import PlatformUsage from '../pages/platform/PlatformUsage';
import SecurityAuditLogs from '../pages/platform/SecurityAuditLogs';
import LoginActivity from '../pages/platform/LoginActivity';
import SecurityEvents from '../pages/platform/SecurityEvents';
import SubscriptionHistory from '../pages/platform/SubscriptionHistory';
import FailedLoginAttempts from '../pages/platform/FailedLoginAttempts';
import OrganizationReport from '../pages/platform/OrganizationReport';
import UserReport from '../pages/platform/UserReport';
import ExamUsageReport from '../pages/platform/ExamUsageReport';
import PlatformUsageReport from '../pages/platform/PlatformUsageReport';
import PlatformAuditReports from '../pages/platform/AuditReports';
import PlatformSettings from '../pages/platform/PlatformSettings';
import TenantSettings from '../pages/platform/TenantSettings';
import EmailSettings from '../pages/platform/EmailSettings';
import PlatformNotificationSettings from '../pages/platform/NotificationSettings';
import SecuritySettings from '../pages/platform/SecuritySettings';
import PlatformAnnouncement from '../pages/platform/PlatformAnnouncement';
import PlatformNotificationHistory from '../pages/platform/PlatformNotificationHistory';
import PlatformNotificationTemplates from '../pages/platform/PlatformNotificationTemplates';
import PlatformDashboard from '../pages/platform/PlatformDashboard';
import MonitoringOverview from '../pages/platform/monitoring/MonitoringOverview';
import MonitoringActiveOrganizations from '../pages/platform/monitoring/ActiveOrganizations';
import MonitoringActiveExams from '../pages/platform/monitoring/ActiveExams';
import MonitoringSystemHealth from '../pages/platform/monitoring/SystemHealth';
import MonitoringServiceStatus from '../pages/platform/monitoring/ServiceStatus';
import SystemLogs from '../pages/platform/SystemLogs';
import PlatformAllExams from '../pages/platform/PlatformAllExams';
import PlatformExamCategories from '../pages/platform/PlatformExamCategories';
import PlatformSections from '../pages/platform/PlatformSections';
import PlatformQuestionBank from '../pages/platform/PlatformQuestionBank';
import PlatformExamTags from '../pages/platform/PlatformExamTags';
import PlatformComingSoon from '../pages/platform/PlatformComingSoon';
import { platformComingSoonRoutes } from './platformComingSoonRoutes';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />
      <Route path="/register" element={<Home />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['Admin']}>
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
        path="/admin/users/import"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ImportUsers />
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
        path="/admin/exam-types"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ManageExamTypes />
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
        path="/admin/exams/:examId/sections"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ManageSections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/wizard/sections"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamWizardSections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/wizard/configuration"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamWizardConfiguration />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/wizard/review"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamWizardReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/sections/reorder"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ReorderSections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/sections/create"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SectionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/sections/:sectionId/edit"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SectionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:examId/sections/:sectionId"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SectionDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live-monitoring/active-exams"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ActiveExams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live-monitoring/student-attempts"
        element={
          <ProtectedRoute roles={['Admin']}>
            <StudentAttempts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live-monitoring/security-violations"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SecurityViolations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live-monitoring/proctoring"
        element={
          <ProtectedRoute roles={['Admin']}>
            <Proctoring />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/results" element={<Navigate to="/admin/results/exams" replace />} />
      <Route
        path="/admin/results/exams"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results/students"
        element={
          <ProtectedRoute roles={['Admin']}>
            <StudentResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results/analytics"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ResultAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results/publish"
        element={
          <ProtectedRoute roles={['Admin']}>
            <PublishResults />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/reports" element={<Navigate to="/admin/reports/exams" replace />} />
      <Route
        path="/admin/reports/exams"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/students"
        element={
          <ProtectedRoute roles={['Admin']}>
            <StudentReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/performance"
        element={
          <ProtectedRoute roles={['Admin']}>
            <PerformanceReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/audit"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AuditReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/exam-type-wise"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamTypeWiseReport />
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
        path="/admin/exams/:examId/grading"
        element={
          <ProtectedRoute roles={['Admin']}>
            <GradeAnswers />
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
        path="/certificates"
        element={
          <ProtectedRoute>
            <MyCertificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificates/:examId"
        element={
          <ProtectedRoute>
            <CertificateDetails />
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
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
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
        path="/admin/notifications/templates"
        element={
          <ProtectedRoute roles={['Admin']}>
            <NotificationTemplates />
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
      <Route
        path="/admin/settings/general"
        element={
          <ProtectedRoute roles={['Admin']}>
            <GeneralSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/exams"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ExamSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/security"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SecuritySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/proctoring"
        element={
          <ProtectedRoute roles={['Admin']}>
            <ProctoringSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/notifications"
        element={
          <ProtectedRoute roles={['Admin']}>
            <NotificationSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/system"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SystemSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/dashboard"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/organizations"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <ManageTenants />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/organizations/create"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <CreateOrganization />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/organizations/:id"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <OrganizationDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/organizations/active"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <ManageTenants statusFilter="active" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/organizations/suspended"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <ManageTenants statusFilter="suspended" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/organizations/trial"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <ManageTenants statusFilter="trial" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/users"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <AllUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/users/organization-admins"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <AllUsers roleFilter="Admin" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/users/students"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <AllUsers roleFilter="Student" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/users/platform-admins"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <AllUsers roleFilter="SuperAdmin" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/exams"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformAllExams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/exams/categories"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformExamCategories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/exams/sections"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformSections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/exams/question-bank"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformQuestionBank />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/exams/tags"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformExamTags />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/subscriptions"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SubscriptionPlans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/subscriptions/plans"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SubscriptionPlans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/subscriptions/organizations"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <OrganizationsAndPlans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/subscriptions/usage"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformUsage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/subscriptions/history"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SubscriptionHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/security/audit-logs"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SecurityAuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/security/login-activity"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <LoginActivity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/security"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SecurityEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/security/events"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SecurityEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/security/failed-logins"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <FailedLoginAttempts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/reports"
        element={<Navigate to="/platform/reports/organizations" replace />}
      />
      <Route
        path="/platform/reports/organizations"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <OrganizationReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/reports/users"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <UserReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/reports/exam-usage"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <ExamUsageReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/reports/platform-usage"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformUsageReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/reports/audit"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformAuditReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/settings"
        element={<Navigate to="/platform/settings/platform" replace />}
      />
      <Route
        path="/platform/settings/platform"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/settings/tenant"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <TenantSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/settings/email"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <EmailSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/settings/notifications"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformNotificationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/settings/security"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SecuritySettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/notifications"
        element={<Navigate to="/platform/notifications/announcement" replace />}
      />
      <Route
        path="/platform/notifications/announcement"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformAnnouncement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/notifications/history"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformNotificationHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/notifications/templates"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <PlatformNotificationTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/monitoring"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <MonitoringOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/monitoring/active-organizations"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <MonitoringActiveOrganizations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/monitoring/active-exams"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <MonitoringActiveExams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/monitoring/system-health"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <MonitoringSystemHealth />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/monitoring/service-status"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <MonitoringServiceStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/system-logs"
        element={
          <ProtectedRoute roles={['SuperAdmin']}>
            <SystemLogs />
          </ProtectedRoute>
        }
      />
      {platformComingSoonRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRoute roles={['SuperAdmin']}>
              <PlatformComingSoon active={route.active} parent={route.parent} title={route.title} />
            </ProtectedRoute>
          }
        />
      ))}
    </Routes>
  );
}
