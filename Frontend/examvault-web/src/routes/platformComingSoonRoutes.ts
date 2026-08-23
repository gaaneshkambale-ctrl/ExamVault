// Every Super Admin menu leaf from ExamVault Super Admin Menu.txt that has
// no backend yet - see that file's IMPLEMENTATION NOTES for why each group
// is deferred. `active` matches PlatformSidebar's NavChild/NavGroup keys so
// the sidebar highlights correctly on each page.
export interface PlatformComingSoonRoute {
  path: string;
  active: string;
  parent: string;
  title: string;
}

export const platformComingSoonRoutes: PlatformComingSoonRoute[] = [
  { path: '/platform/organizations/trial', active: 'org-trial', parent: 'Organizations', title: 'Trial Organizations' },
  { path: '/platform/organizations/details', active: 'org-details', parent: 'Organizations', title: 'Organization Details' },

  { path: '/platform/users', active: 'users-all', parent: 'Users', title: 'All Users' },
  { path: '/platform/users/organization-admins', active: 'users-org-admins', parent: 'Users', title: 'Organization Admins' },
  { path: '/platform/users/students', active: 'users-students', parent: 'Users', title: 'Students' },
  { path: '/platform/users/platform-admins', active: 'users-platform-admins', parent: 'Users', title: 'Platform Admins' },
  { path: '/platform/users/roles', active: 'users-roles', parent: 'Users', title: 'Roles & Permissions' },

  { path: '/platform/exams', active: 'exams-all', parent: 'Exams', title: 'All Exams' },
  { path: '/platform/exams/categories', active: 'exams-categories', parent: 'Exams', title: 'Exam Categories' },
  { path: '/platform/exams/sections', active: 'exams-sections', parent: 'Exams', title: 'Sections' },
  { path: '/platform/exams/question-bank', active: 'exams-question-bank', parent: 'Exams', title: 'Question Bank' },
  { path: '/platform/exams/tags', active: 'exams-tags', parent: 'Exams', title: 'Tags' },

  { path: '/platform/subscriptions', active: 'subs-plans', parent: 'Subscriptions', title: 'Plans' },
  { path: '/platform/subscriptions/plans', active: 'subs-plans', parent: 'Subscriptions', title: 'Plans' },
  { path: '/platform/subscriptions/organizations', active: 'subs-orgs', parent: 'Subscriptions', title: 'Organizations & Plans' },
  { path: '/platform/subscriptions/usage', active: 'subs-usage', parent: 'Subscriptions', title: 'Usage' },
  { path: '/platform/subscriptions/history', active: 'subs-history', parent: 'Subscriptions', title: 'Subscription History' },

  { path: '/platform/monitoring', active: 'mon-active-orgs', parent: 'System Monitoring', title: 'Active Organizations' },
  { path: '/platform/monitoring/active-organizations', active: 'mon-active-orgs', parent: 'System Monitoring', title: 'Active Organizations' },
  { path: '/platform/monitoring/active-exams', active: 'mon-active-exams', parent: 'System Monitoring', title: 'Active Exams' },
  { path: '/platform/monitoring/system-health', active: 'mon-system-health', parent: 'System Monitoring', title: 'System Health' },
  { path: '/platform/monitoring/api-health', active: 'mon-api-health', parent: 'System Monitoring', title: 'API Health' },
  { path: '/platform/monitoring/service-status', active: 'mon-service-status', parent: 'System Monitoring', title: 'Service Status' },

  { path: '/platform/notifications', active: 'notif-announcement', parent: 'Notifications', title: 'Platform Announcement' },
  { path: '/platform/notifications/announcement', active: 'notif-announcement', parent: 'Notifications', title: 'Platform Announcement' },
  { path: '/platform/notifications/history', active: 'notif-history', parent: 'Notifications', title: 'Notification History' },
  { path: '/platform/notifications/templates', active: 'notif-templates', parent: 'Notifications', title: 'Templates' },

  { path: '/platform/reports', active: 'reports-org', parent: 'Reports', title: 'Organization Report' },
  { path: '/platform/reports/organizations', active: 'reports-org', parent: 'Reports', title: 'Organization Report' },
  { path: '/platform/reports/users', active: 'reports-users', parent: 'Reports', title: 'User Report' },
  { path: '/platform/reports/exam-usage', active: 'reports-exam-usage', parent: 'Reports', title: 'Exam Usage' },
  { path: '/platform/reports/platform-usage', active: 'reports-platform-usage', parent: 'Reports', title: 'Platform Usage' },
  { path: '/platform/reports/audit', active: 'reports-audit', parent: 'Reports', title: 'Audit Reports' },

  { path: '/platform/security', active: 'sec-events', parent: 'Security', title: 'Security Events' },
  { path: '/platform/security/events', active: 'sec-events', parent: 'Security', title: 'Security Events' },
  { path: '/platform/security/login-activity', active: 'sec-login-activity', parent: 'Security', title: 'Login Activity' },
  { path: '/platform/security/failed-logins', active: 'sec-failed-logins', parent: 'Security', title: 'Failed Login Attempts' },
  { path: '/platform/security/audit-logs', active: 'sec-audit-logs', parent: 'Security', title: 'Audit Logs' },

  { path: '/platform/settings', active: 'settings-platform', parent: 'Settings', title: 'Platform Settings' },
  { path: '/platform/settings/platform', active: 'settings-platform', parent: 'Settings', title: 'Platform Settings' },
  { path: '/platform/settings/tenant', active: 'settings-tenant', parent: 'Settings', title: 'Tenant Settings' },
  { path: '/platform/settings/email', active: 'settings-email', parent: 'Settings', title: 'Email Settings' },
  { path: '/platform/settings/notifications', active: 'settings-notifications', parent: 'Settings', title: 'Notification Settings' },
  { path: '/platform/settings/security', active: 'settings-security', parent: 'Settings', title: 'Security Settings' },

  { path: '/platform/system-logs', active: 'system-logs', parent: 'Platform Admin', title: 'System Logs' },
];
