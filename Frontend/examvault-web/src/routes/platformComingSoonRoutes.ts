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

  { path: '/platform/users/roles', active: 'users-roles', parent: 'Users', title: 'Roles & Permissions' },

  { path: '/platform/questions', active: 'questions', parent: 'Platform Admin', title: 'Questions' },
  { path: '/platform/submissions', active: 'submissions', parent: 'Platform Admin', title: 'Submissions' },

  { path: '/platform/subscriptions/history', active: 'subs-history', parent: 'Subscriptions', title: 'Subscription History' },

  { path: '/platform/monitoring/api-health', active: 'mon-api-health', parent: 'System Monitoring', title: 'API Health' },
];
