import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import DeactivateTenantButton from '../../components/DeactivateTenantButton';
import ReactivateTenantButton from '../../components/ReactivateTenantButton';
import StartTrialButton from '../../components/StartTrialButton';
import EndTrialButton from '../../components/EndTrialButton';
import OrgAvatar from '../../components/OrgAvatar';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import { useTenants } from '../../hooks/useTenants';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import {
  createTenantAdmin,
  deleteTenant,
  getTenantRolePermissions,
  resetTenantAdminPassword,
  updateTenant,
  updateTenantRolePermissions,
} from '../../api/tenantsApi';
import { assignPlanToTenant, listPlans } from '../../api/plansApi';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';
import { getAuditLogs } from '../../api/auditApi';
import { extractServerError } from '../../utils/apiError';
import { isValidEmail } from '../../utils/email';
import { timeAgo } from '../../utils/timeAgo';
import { PLAN_FEATURE_LABELS } from '../../types/plan';
import { ORGANIZATION_TYPES } from '../../types/tenant';
import {
  COSMETIC_PERMISSIONS,
  ADMIN_PERMISSIONS,
  INSTRUCTOR_PERMISSIONS,
  STUDENT_PERMISSIONS,
  type CosmeticPermission,
} from '../../constants/cosmeticRolePermissions';

const ACTIVITY_LOG_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const ACTIVITY_LOG_TO = new Date().toISOString();

// Matches org_submenu.png's Organization Details page - all 8 tabs are now
// real, no placeholder surfaces left. Overview/Admins/Subscriptions/
// Activity Log have real data behind them (Organization Code/Type/Address
// included, editable via the Actions panel's Edit Organization); Settings
// hosts a real Role Permissions panel (Super Admin's counterpart to a
// tenant's own self-service Roles & Permissions page - see tenantsApi.ts's
// getTenantRolePermissions/updateTenantRolePermissions), covering all 3
// real tenant roles (Admin/Instructor/Student) via a role selector. Users
// and Exams are real per-org tables (same cross-tenant queries the header
// stats already use, filtered to this org - same shape as
// AllUsers.tsx/PlatformAllExams.tsx's own tables). Usage shows real Users-
// by-Role and Exams-by-Status donuts from that same data; exam attempts/
// pass-rate stay unshown - there's no cross-tenant submissions endpoint to
// source them from, the same gap the platform's own Exam Usage report
// (ExamUsageReport.tsx) has. Add Admin (real) lives on the Admins tab;
// Suspend/Edit/Reset Admin Password/Delete (all real) live in the Actions
// panel.
const TABS = ['Overview', 'Usage', 'Admins', 'Users', 'Exams', 'Subscriptions', 'Activity Log', 'Settings'] as const;
type DetailTab = (typeof TABS)[number];

// The 3 real, assignable tenant roles (mirrors backend
// RolePermissionCatalog.TenantAssignableRoles) - Super Admin and Viewer are
// not real UserRole values within a tenant's own Users list, so they're not
// offered here.
const TENANT_ROLES = ['Admin', 'Instructor', 'Student'] as const;
type TenantRole = (typeof TENANT_ROLES)[number];

// Mirrors RolePermissionCatalog.DefaultsForRole(role) server-side - used
// only to seed "Reset to Default" below; it edits the draft, it doesn't
// save on its own.
const DEFAULTS_BY_ROLE: Record<TenantRole, CosmeticPermission[]> = {
  Admin: ADMIN_PERMISSIONS,
  Instructor: INSTRUCTOR_PERMISSIONS,
  Student: STUDENT_PERMISSIONS,
};

// Real, as of this feature: grepped every service's PermissionPolicies.cs
// and cross-referenced actual [Authorize(Policy = ...)] usage on real
// controller actions. 10 of the 12 catalog keys have a real backend check
// behind them today; only Dashboard-View and Certificates-View don't (no
// endpoint exists to gate). Purely informational here - every permission
// stays togglable and savable regardless, since RolePermissionCatalog
// itself doesn't restrict which keys can be set.
const SERVER_ENFORCED_PERMISSIONS = new Set<CosmeticPermission>([
  'Exams - Create',
  'Exams - Edit',
  'Questions - Create',
  'Questions - Edit',
  'Results - View',
  'Users - View',
  'Users - Edit',
  'Settings - View',
  'Settings - Edit',
  'Reports - View',
]);

function RoleGridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function RoleDocumentPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /><line x1="12" y1="12" x2="12" y2="18" />
    </svg>
  );
}

function RolePencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

function RoleQuestionCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function RoleBarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function RoleUsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function RoleUserEditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
      <path d="M17.5 14.5 21 11l2 2-3.5 3.5L17 17z" />
    </svg>
  );
}

function RoleGearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function RolePieChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function RoleAwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" />
    </svg>
  );
}

function RoleLockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function RoleCrownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 5 5 5-8 5 8 5-5-2 14H4z" />
    </svg>
  );
}

function RolePersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const ROLE_SELECTOR_STYLE: Record<TenantRole, { icon: ReactNode; iconBg: string; iconColor: string }> = {
  Admin: { icon: <RoleCrownIcon />, iconBg: '#ede9fe', iconColor: '#7c3aed' },
  Instructor: { icon: <RolePersonIcon />, iconBg: '#ffedd5', iconColor: '#ea580c' },
  Student: { icon: <RolePersonIcon />, iconBg: '#dcfce7', iconColor: '#16a34a' },
};

const PERMISSION_INFO: Record<CosmeticPermission, { icon: ReactNode; iconBg: string; iconColor: string; description: string }> = {
  'Dashboard - View': { icon: <RoleGridIcon />, iconBg: '#eef2ff', iconColor: '#4f46e5', description: 'View dashboard and analytics.' },
  'Exams - Create': { icon: <RoleDocumentPlusIcon />, iconBg: '#dcfce7', iconColor: '#16a34a', description: 'Create new exams.' },
  'Exams - Edit': { icon: <RolePencilIcon />, iconBg: '#ffedd5', iconColor: '#ea580c', description: 'Edit existing exams.' },
  'Questions - Create': { icon: <RoleQuestionCircleIcon />, iconBg: '#ede9fe', iconColor: '#7c3aed', description: 'Create new questions.' },
  'Questions - Edit': { icon: <RoleQuestionCircleIcon />, iconBg: '#dbeafe', iconColor: '#2563eb', description: 'Edit existing questions.' },
  'Results - View': { icon: <RoleBarChartIcon />, iconBg: '#dbeafe', iconColor: '#2563eb', description: 'View exam results.' },
  'Users - View': { icon: <RoleUsersIcon />, iconBg: '#dbeafe', iconColor: '#2563eb', description: 'View users and their details.' },
  'Users - Edit': { icon: <RoleUserEditIcon />, iconBg: '#ffedd5', iconColor: '#ea580c', description: 'Edit user information.' },
  'Settings - View': { icon: <RoleGearIcon />, iconBg: '#dcfce7', iconColor: '#16a34a', description: 'View organization settings.' },
  'Settings - Edit': { icon: <RoleGearIcon />, iconBg: '#dcfce7', iconColor: '#16a34a', description: 'Edit organization settings.' },
  'Reports - View': { icon: <RolePieChartIcon />, iconBg: '#fce7f3', iconColor: '#db2777', description: 'View reports and analytics.' },
  'Certificates - View': { icon: <RoleAwardIcon />, iconBg: '#fef9c3', iconColor: '#ca8a04', description: 'View certificates.' },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between small py-1 border-bottom">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: tenants, isLoading } = useTenants();
  const tenant = tenants?.find((t) => t.id === id);
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const currentPlan = plans?.find((p) => p.id === tenant?.planId);

  const [tab, setTab] = useState<DetailTab>('Overview');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const createAdminMutation = useMutation({
    mutationFn: () => createTenantAdmin(tenant!.id, { fullName: adminFullName, email: adminEmail }),
  });

  const assignPlanMutation = useMutation({
    mutationFn: () => assignPlanToTenant(tenant!.id, selectedPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowChangePlan(false);
    },
  });

  const openAddAdmin = () => {
    createAdminMutation.reset();
    setAdminFullName('');
    setAdminEmail('');
    setShowAddAdmin(true);
  };

  const openChangePlan = () => {
    assignPlanMutation.reset();
    setSelectedPlanId(tenant?.planId ?? '');
    setShowChangePlan(true);
  };

  // Cross-tenant, same query AllUsers.tsx already uses for its Super Admin
  // "see everyone" view - filtered down to this one org below rather than
  // adding a new tenant-scoped endpoint for a feature this small.
  const { data: allUsers } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const tenantAdmins = useMemo(
    () => (allUsers ?? []).filter((u) => u.tenantId === tenant?.id && u.role === 'Admin'),
    [allUsers, tenant?.id],
  );
  const tenantUsers = useMemo(
    () => (allUsers ?? []).filter((u) => u.tenantId === tenant?.id),
    [allUsers, tenant?.id],
  );
  const primaryAdmin = tenantAdmins[0];

  // Same cross-tenant query PlatformAllExams.tsx already uses (same query
  // key, so React Query dedupes rather than fetching twice) - filtered down
  // to this one org for the header/Quick Stats counts below.
  const { data: allExams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const tenantExams = useMemo(
    () => (allExams ?? []).filter((e) => e.tenantId === tenant?.id),
    [allExams, tenant?.id],
  );
  // exam.totalQuestions is a legacy field never kept in sync with Question
  // Service - same reason PlatformAllExams.tsx computes the real count
  // instead of trusting it.
  const questionCounts = useQuestionCountsByExam(tab === 'Exams' ? tenantExams.map((e) => e.id) : undefined);

  const examStatusCounts = useMemo(
    () => ({
      Published: tenantExams.filter((e) => e.status === 'Published').length,
      Draft: tenantExams.filter((e) => e.status === 'Draft').length,
      Archived: tenantExams.filter((e) => e.status === 'Archived').length,
    }),
    [tenantExams],
  );
  const userRoleCounts = useMemo(
    () => ({
      Admin: tenantUsers.filter((u) => u.role === 'Admin').length,
      Instructor: tenantUsers.filter((u) => u.role === 'Instructor').length,
      Student: tenantUsers.filter((u) => u.role === 'Student').length,
    }),
    [tenantUsers],
  );

  const { data: activityLogs, isLoading: isLoadingActivity, isError: isActivityError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(ACTIVITY_LOG_FROM, ACTIVITY_LOG_TO),
    enabled: tab === 'Activity Log',
  });
  const tenantActivityLogs = (activityLogs ?? []).filter((log) => log.tenantId === tenant?.id);

  // Search + pagination for the Users/Exams/Activity Log tabs - same
  // PAGE_SIZE_OPTIONS + Form.Select pattern ManageExams.tsx/
  // ManageExamTypes.tsx already use, one independent set of state per tab.
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  useEffect(() => setUserPage(1), [userSearch, userPageSize]);

  const filteredTenantUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return tenantUsers;
    return tenantUsers.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [tenantUsers, userSearch]);
  const userTotalPages = Math.max(1, Math.ceil(filteredTenantUsers.length / userPageSize));
  const userCurrentPage = Math.min(userPage, userTotalPages);
  const pagedTenantUsers = filteredTenantUsers.slice(
    (userCurrentPage - 1) * userPageSize,
    userCurrentPage * userPageSize,
  );
  const userRangeStart = filteredTenantUsers.length === 0 ? 0 : (userCurrentPage - 1) * userPageSize + 1;
  const userRangeEnd = Math.min(userCurrentPage * userPageSize, filteredTenantUsers.length);

  const [examSearch, setExamSearch] = useState('');
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  useEffect(() => setExamPage(1), [examSearch, examPageSize]);

  const filteredTenantExams = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    if (!q) return tenantExams;
    return tenantExams.filter(
      (e) => e.title.toLowerCase().includes(q) || (e.category ?? '').toLowerCase().includes(q),
    );
  }, [tenantExams, examSearch]);
  const examTotalPages = Math.max(1, Math.ceil(filteredTenantExams.length / examPageSize));
  const examCurrentPage = Math.min(examPage, examTotalPages);
  const pagedTenantExams = filteredTenantExams.slice(
    (examCurrentPage - 1) * examPageSize,
    examCurrentPage * examPageSize,
  );
  const examRangeStart = filteredTenantExams.length === 0 ? 0 : (examCurrentPage - 1) * examPageSize + 1;
  const examRangeEnd = Math.min(examCurrentPage * examPageSize, filteredTenantExams.length);

  const [activitySearch, setActivitySearch] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  useEffect(() => setActivityPage(1), [activitySearch, activityPageSize]);

  const filteredActivityLogs = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    if (!q) return tenantActivityLogs;
    return tenantActivityLogs.filter(
      (log) =>
        (log.userName ?? '').toLowerCase().includes(q) ||
        log.activity.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        (log.details ?? '').toLowerCase().includes(q),
    );
  }, [tenantActivityLogs, activitySearch]);
  const activityTotalPages = Math.max(1, Math.ceil(filteredActivityLogs.length / activityPageSize));
  const activityCurrentPage = Math.min(activityPage, activityTotalPages);
  const pagedActivityLogs = filteredActivityLogs.slice(
    (activityCurrentPage - 1) * activityPageSize,
    activityCurrentPage * activityPageSize,
  );
  const activityRangeStart =
    filteredActivityLogs.length === 0 ? 0 : (activityCurrentPage - 1) * activityPageSize + 1;
  const activityRangeEnd = Math.min(activityCurrentPage * activityPageSize, filteredActivityLogs.length);

  const [selectedRole, setSelectedRole] = useState<TenantRole>('Admin');
  const { data: rolePermissions, isLoading: isLoadingRolePermissions } = useQuery({
    queryKey: ['tenant-role-permissions', tenant?.id, selectedRole],
    queryFn: () => getTenantRolePermissions(tenant!.id, selectedRole),
    enabled: tab === 'Settings' && !!tenant,
  });
  const [draftRolePermissions, setDraftRolePermissions] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (rolePermissions) {
      setDraftRolePermissions(new Set(rolePermissions));
    }
  }, [rolePermissions]);
  const toggleRolePermission = (perm: string) => {
    setDraftRolePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };
  const updateRolePermissionsMutation = useMutation({
    mutationFn: () => updateTenantRolePermissions(tenant!.id, selectedRole, [...draftRolePermissions]),
    onSuccess: (permissions) => {
      queryClient.setQueryData(['tenant-role-permissions', tenant!.id, selectedRole], permissions);
    },
  });
  // Resets the draft to RolePermissionCatalog's default set for the
  // selected role - edits the checkboxes only, still requires Save Changes
  // to actually persist, same as every other draft-then-save form here.
  const resetRolePermissionsToDefault = () => {
    setDraftRolePermissions(new Set(DEFAULTS_BY_ROLE[selectedRole]));
  };

  const [showEditOrg, setShowEditOrg] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editOrgCode, setEditOrgCode] = useState('');
  const [editOrgType, setEditOrgType] = useState('');
  const [editAddressLine1, setEditAddressLine1] = useState('');
  const [editAddressLine2, setEditAddressLine2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const updateTenantMutation = useMutation({
    mutationFn: () =>
      updateTenant(tenant!.id, {
        name: editName.trim(),
        slug: editSlug.trim(),
        organizationCode: editOrgCode.trim() || null,
        organizationType: editOrgType || null,
        addressLine1: editAddressLine1.trim() || null,
        addressLine2: editAddressLine2.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        postalCode: editPostalCode.trim() || null,
        country: editCountry.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowEditOrg(false);
    },
  });

  const openEditOrg = () => {
    updateTenantMutation.reset();
    setEditName(tenant?.name ?? '');
    setEditSlug(tenant?.slug ?? '');
    setEditOrgCode(tenant?.organizationCode ?? '');
    setEditOrgType(tenant?.organizationType ?? '');
    setEditAddressLine1(tenant?.addressLine1 ?? '');
    setEditAddressLine2(tenant?.addressLine2 ?? '');
    setEditCity(tenant?.city ?? '');
    setEditState(tenant?.state ?? '');
    setEditPostalCode(tenant?.postalCode ?? '');
    setEditCountry(tenant?.country ?? '');
    setShowEditOrg(true);
  };

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetTargetAdminId, setResetTargetAdminId] = useState('');

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetTenantAdminPassword(tenant!.id, resetTargetAdminId),
  });

  const openResetPassword = () => {
    resetPasswordMutation.reset();
    setResetTargetAdminId(tenantAdmins[0]?.id ?? '');
    setShowResetPassword(true);
  };

  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const navigate = useNavigate();

  const deleteTenantMutation = useMutation({
    mutationFn: () => deleteTenant(tenant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate('/platform/organizations');
    },
  });

  const openDeleteOrg = () => {
    deleteTenantMutation.reset();
    setDeleteConfirmText('');
    setShowDeleteOrg(true);
  };

  if (isLoading) {
    return (
      <PlatformLayout active="org-all">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </PlatformLayout>
    );
  }

  if (!tenant) {
    return (
      <PlatformLayout active="org-all">
        <div className="text-center text-muted py-5">
          Organization not found. <Link to="/platform/organizations">Back to All Organizations</Link>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout active="org-all">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Organizations / Organization Details</p>
          <Link to="/platform/organizations" className="small text-decoration-none">
            &larr; Back to All Organizations
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
          <OrgAvatar name={tenant.name} size={56} />
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0">{tenant.name}</h1>
              <Badge bg={tenant.isActive ? 'success' : 'secondary'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
              {tenant.isTrial && <Badge bg="info">Trial</Badge>}
            </div>
            <div className="text-muted small">{tenant.slug}.examvaults.in</div>
            <div className="text-muted small">Tenant ID: {tenant.id}</div>
          </div>
          <div className="d-flex gap-4 small text-muted">
            <div>
              <div>Created On</div>
              <div className="text-body">{new Date(tenant.createdAtUtc).toLocaleDateString()}</div>
            </div>
            <div>
              <div>Plan</div>
              <div className="text-body">{currentPlan?.name ?? '—'}</div>
            </div>
            <div>
              <div>Admin Contact</div>
              <div className="text-body">{primaryAdmin ? primaryAdmin.email : '—'}</div>
            </div>
            <div>
              <div>Total Users</div>
              <div className="text-body">{tenantUsers.length}</div>
            </div>
            <div>
              <div>Total Exams</div>
              <div className="text-body">{tenantExams.length}</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="d-flex gap-3 border-bottom mb-3 small flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="btn btn-link p-0 pb-2 text-decoration-none text-nowrap"
            style={t === tab ? { color: '#4f46e5', fontWeight: 600, borderBottom: '2px solid #4f46e5' } : { color: '#6b7280' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          {tab === 'Overview' && (
            <>
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Organization Information</h2>
                  <InfoRow label="Organization Name" value={tenant.name} />
                  <InfoRow label="Organization Code" value={tenant.organizationCode ?? '—'} />
                  <InfoRow label="Subdomain" value={`${tenant.slug}.examvaults.in`} />
                  <InfoRow label="Organization Type" value={tenant.organizationType ?? '—'} />
                  <InfoRow label="Plan / Subscription" value={currentPlan?.name ?? '—'} />
                  <InfoRow label="Status" value={tenant.isActive ? 'Active' : 'Inactive'} />
                  <InfoRow
                    label="Trial"
                    value={
                      tenant.isTrial && tenant.trialEndsAtUtc
                        ? `Yes - ends ${new Date(tenant.trialEndsAtUtc).toLocaleDateString()}`
                        : 'No'
                    }
                  />
                  <InfoRow label="Registration Date" value={new Date(tenant.createdAtUtc).toLocaleString()} />
                  <InfoRow label="Description" value="—" />
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Admin Information</h2>
                  {primaryAdmin ? (
                    <>
                      <InfoRow label="Name" value={primaryAdmin.fullName} />
                      <InfoRow label="Email" value={primaryAdmin.email} />
                      <InfoRow label="Status" value={primaryAdmin.isActive ? 'Active' : 'Inactive'} />
                      {tenantAdmins.length > 1 && (
                        <div className="text-muted small mt-2">
                          +{tenantAdmins.length - 1} more admin{tenantAdmins.length - 1 === 1 ? '' : 's'} - see the
                          Admins tab.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted small mb-2">No admin added yet - use the Admins tab to add one.</div>
                  )}
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Address Information</h2>
                  <InfoRow label="Address Line 1" value={tenant.addressLine1 ?? '—'} />
                  <InfoRow label="Address Line 2" value={tenant.addressLine2 ?? '—'} />
                  <InfoRow label="City" value={tenant.city ?? '—'} />
                  <InfoRow label="State" value={tenant.state ?? '—'} />
                  <InfoRow label="Postal Code" value={tenant.postalCode ?? '—'} />
                  <InfoRow label="Country" value={tenant.country ?? '—'} />
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Subscription Information</h2>
                  <InfoRow label="Current Plan" value={currentPlan?.name ?? '—'} />
                  <InfoRow label="Plan Description" value={currentPlan?.description ?? '—'} />
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Modules &amp; Features</h2>
                  {!currentPlan || currentPlan.includedFeatures.length === 0 ? (
                    <div className="text-center text-muted small py-3">No modules included in the current plan.</div>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {currentPlan.includedFeatures.map((f) => (
                        <Badge key={f} bg="light" text="dark" className="border">
                          {PLAN_FEATURE_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </>
          )}

          {tab === 'Subscriptions' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-bold mb-0">Subscription</h2>
                  <Button variant="primary" size="sm" onClick={openChangePlan}>
                    Change Plan
                  </Button>
                </div>
                <InfoRow label="Current Plan" value={currentPlan?.name ?? '—'} />
                <InfoRow label="Plan Description" value={currentPlan?.description ?? '—'} />
                <div className="mt-3">
                  <div className="text-muted small mb-2">Included Modules</div>
                  {!currentPlan || currentPlan.includedFeatures.length === 0 ? (
                    <div className="text-muted small">No modules included.</div>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {currentPlan.includedFeatures.map((f) => (
                        <Badge key={f} bg="light" text="dark" className="border">
                          {PLAN_FEATURE_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}

          {tab === 'Admins' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-bold mb-0">Admins</h2>
                  <Button variant="primary" size="sm" onClick={openAddAdmin}>
                    + Add Admin
                  </Button>
                </div>
                {tenantAdmins.length === 0 ? (
                  <div className="text-center text-muted small py-3">No admins yet. Click "+ Add Admin" to add one.</div>
                ) : (
                  <Table responsive hover size="sm" className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantAdmins.map((admin) => (
                        <tr key={admin.id}>
                          <td>{admin.fullName}</td>
                          <td className="text-muted">{admin.email}</td>
                          <td>
                            <Badge bg={admin.isActive ? 'success' : 'secondary'}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          {tab === 'Activity Log' && (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h6 fw-bold mb-0">Activity Log ({filteredActivityLogs.length})</h2>
                <InputGroup style={{ width: 260 }}>
                  <InputGroup.Text>
                    <SearchIcon />
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search user, action, module..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                  />
                </InputGroup>
              </div>

              <Card className="border-0 shadow-sm">
                <Card.Body className={isLoadingActivity || isActivityError || pagedActivityLogs.length === 0 ? '' : 'p-0'}>
                  {isLoadingActivity && (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" />
                    </div>
                  )}
                  {isActivityError && (
                    <div className="text-center text-danger py-5">Couldn't load activity log. Please try again.</div>
                  )}
                  {!isLoadingActivity && !isActivityError && tenantActivityLogs.length === 0 && (
                    <div className="text-center text-muted py-5">No activity recorded for this organization yet.</div>
                  )}
                  {!isLoadingActivity && !isActivityError && tenantActivityLogs.length > 0 && filteredActivityLogs.length === 0 && (
                    <div className="text-center text-muted py-5">No activity matches your search.</div>
                  )}
                  {!isLoadingActivity && !isActivityError && pagedActivityLogs.length > 0 && (
                    <Table responsive hover className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase bg-light">
                        <tr>
                          <th className="ps-4">Time</th>
                          <th>User</th>
                          <th>Action</th>
                          <th>Module</th>
                          <th className="pe-4">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedActivityLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                              {new Date(log.timestampUtc).toLocaleString()}
                            </td>
                            <td>{log.userName ?? '—'}</td>
                            <td>
                              <Badge bg="light" text="dark" className="border">
                                {log.activity}
                              </Badge>
                            </td>
                            <td className="text-muted">{log.module}</td>
                            <td className="pe-4 text-muted" style={{ fontSize: 13 }}>
                              {log.details ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>

              {!isLoadingActivity && !isActivityError && filteredActivityLogs.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted small">
                    Showing {activityRangeStart} to {activityRangeEnd} of {filteredActivityLogs.length} entries
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <Pagination className="mb-0">
                      <Pagination.Prev
                        disabled={activityCurrentPage === 1}
                        onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      />
                      {Array.from({ length: activityTotalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p} active={p === activityCurrentPage} onClick={() => setActivityPage(p)}>
                          {p}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next
                        disabled={activityCurrentPage === activityTotalPages}
                        onClick={() => setActivityPage((p) => Math.min(activityTotalPages, p + 1))}
                      />
                    </Pagination>
                    <Form.Select
                      size="sm"
                      style={{ width: 100 }}
                      value={activityPageSize}
                      onChange={(e) => setActivityPageSize(Number(e.target.value))}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} / page
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'Settings' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-start gap-3 mb-1">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: 40, height: 40, background: '#eef2ff', color: '#4f46e5' }}
                  >
                    <RoleGearIcon />
                  </div>
                  <div>
                    <h2 className="h6 fw-bold mb-1">Role Permissions for this Organization</h2>
                    <p className="text-muted small mb-0">
                      Configure this organization's role permissions directly - the same sets its own Admin
                      can edit from their own console's Roles &amp; Permissions page. Permissions marked{' '}
                      <RoleLockIcon /> Server Enforced are actively checked by the backend on every request;
                      the rest stay informational until their own endpoint enforcement is wired up. Every
                      permission below can still be toggled and saved either way.
                    </p>
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 my-3">
                  {TENANT_ROLES.map((role) => {
                    const style = ROLE_SELECTOR_STYLE[role];
                    const active = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border"
                        style={{
                          background: active ? style.iconBg : '#fff',
                          borderColor: active ? style.iconColor : '#dee2e6',
                          borderWidth: active ? 2 : 1,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          className="d-flex align-items-center justify-content-center rounded-2"
                          style={{ width: 28, height: 28, background: style.iconBg, color: style.iconColor }}
                        >
                          {style.icon}
                        </span>
                        <span className={active ? 'fw-semibold' : 'text-muted'}>{role}</span>
                      </button>
                    );
                  })}
                </div>

                {isLoadingRolePermissions ? (
                  <div className="d-flex justify-content-center py-4">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : (
                  <>
                    <Row className="g-2">
                      {COSMETIC_PERMISSIONS.map((perm) => {
                        const info = PERMISSION_INFO[perm];
                        const enforced = SERVER_ENFORCED_PERMISSIONS.has(perm);
                        const checked = draftRolePermissions.has(perm);
                        return (
                          <Col xs={12} md={6} key={perm}>
                            <label
                              htmlFor={`org-role-perm-${perm}`}
                              className="d-flex align-items-start gap-2 p-2 rounded-3 border h-100"
                              style={{ cursor: 'pointer', background: checked ? '#f8fafc' : '#fff' }}
                            >
                              <span
                                className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                style={{ width: 32, height: 32, background: info.iconBg, color: info.iconColor }}
                              >
                                {info.icon}
                              </span>
                              <span className="flex-grow-1">
                                <span className="d-flex align-items-center gap-2">
                                  <span className="fw-medium">{perm}</span>
                                  {enforced && (
                                    <Badge
                                      bg="light"
                                      text="dark"
                                      className="d-inline-flex align-items-center gap-1 border"
                                      style={{ fontSize: 10, fontWeight: 600 }}
                                    >
                                      <RoleLockIcon /> Server Enforced
                                    </Badge>
                                  )}
                                </span>
                                <span className="d-block text-muted" style={{ fontSize: 12.5 }}>
                                  {info.description}
                                </span>
                              </span>
                              <Form.Check
                                type="checkbox"
                                id={`org-role-perm-${perm}`}
                                checked={checked}
                                onChange={() => toggleRolePermission(perm)}
                                className="flex-shrink-0"
                              />
                            </label>
                          </Col>
                        );
                      })}
                    </Row>
                    {updateRolePermissionsMutation.isError && (
                      <Alert variant="danger" className="mt-3 mb-0 py-2">
                        {extractServerError(updateRolePermissionsMutation.error)}
                      </Alert>
                    )}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <p className="text-muted small mb-0">
                        Changes apply to this organization only and do not affect other organizations.
                      </p>
                      <div className="d-flex gap-2">
                        <Button variant="outline-secondary" onClick={resetRolePermissionsToDefault}>
                          Reset to Default
                        </Button>
                        <Button
                          variant="primary"
                          disabled={updateRolePermissionsMutation.isPending}
                          onClick={() => updateRolePermissionsMutation.mutate()}
                        >
                          {updateRolePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          )}

          {tab === 'Usage' && (
            <>
              <Row xs={1} sm={2} className="g-3 mb-3">
                <Col>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <h2 className="h6 fw-bold mb-3">Users by Role</h2>
                      <SegmentDonutChart
                        centerLabel="Total"
                        segments={[
                          { label: 'Students', value: userRoleCounts.Student, color: '#2563eb' },
                          { label: 'Admins', value: userRoleCounts.Admin, color: '#16a34a' },
                          { label: 'Instructors', value: userRoleCounts.Instructor, color: '#d97706' },
                        ]}
                      />
                    </Card.Body>
                  </Card>
                </Col>
                <Col>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <h2 className="h6 fw-bold mb-3">Exams by Status</h2>
                      <SegmentDonutChart
                        centerLabel="Total"
                        segments={[
                          { label: 'Published', value: examStatusCounts.Published, color: '#16a34a' },
                          { label: 'Draft', value: examStatusCounts.Draft, color: '#d97706' },
                          { label: 'Archived', value: examStatusCounts.Archived, color: '#6b7280' },
                        ]}
                      />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <div className="text-muted small">
                Exam attempts and pass-rate usage aren't shown here - there's no cross-tenant submissions endpoint
                to source them from yet (same gap the platform's own Exam Usage report has).
              </div>
            </>
          )}

          {tab === 'Users' && (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h6 fw-bold mb-0">Users ({filteredTenantUsers.length})</h2>
                <InputGroup style={{ width: 260 }}>
                  <InputGroup.Text>
                    <SearchIcon />
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </InputGroup>
              </div>

              <Card className="border-0 shadow-sm">
                <Card.Body className={pagedTenantUsers.length === 0 ? '' : 'p-0'}>
                  {tenantUsers.length === 0 && (
                    <div className="text-center text-muted small py-3">No users in this organization yet.</div>
                  )}
                  {tenantUsers.length > 0 && filteredTenantUsers.length === 0 && (
                    <div className="text-center text-muted small py-3">No users match your search.</div>
                  )}
                  {pagedTenantUsers.length > 0 && (
                    <Table responsive hover className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase bg-light">
                        <tr>
                          <th className="ps-4">User</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th className="pe-4">Joined On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTenantUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="ps-4">
                              <div className="fw-medium">{user.fullName}</div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {user.email}
                              </div>
                            </td>
                            <td>
                              <Badge
                                bg={
                                  user.role === 'Admin'
                                    ? 'info'
                                    : user.role === 'Instructor'
                                      ? 'warning'
                                      : 'secondary'
                                }
                              >
                                {user.role}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={user.isActive ? 'success' : 'secondary'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="text-muted">{user.lastLoginAtUtc ? timeAgo(user.lastLoginAtUtc) : 'Never'}</td>
                            <td className="pe-4">{new Date(user.createdAtUtc).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>

              {filteredTenantUsers.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted small">
                    Showing {userRangeStart} to {userRangeEnd} of {filteredTenantUsers.length} users
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <Pagination className="mb-0">
                      <Pagination.Prev
                        disabled={userCurrentPage === 1}
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      />
                      {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p} active={p === userCurrentPage} onClick={() => setUserPage(p)}>
                          {p}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next
                        disabled={userCurrentPage === userTotalPages}
                        onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                      />
                    </Pagination>
                    <Form.Select
                      size="sm"
                      style={{ width: 100 }}
                      value={userPageSize}
                      onChange={(e) => setUserPageSize(Number(e.target.value))}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} / page
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'Exams' && (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h6 fw-bold mb-0">Exams ({filteredTenantExams.length})</h2>
                <InputGroup style={{ width: 260 }}>
                  <InputGroup.Text>
                    <SearchIcon />
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search title or category..."
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                  />
                </InputGroup>
              </div>

              <Card className="border-0 shadow-sm">
                <Card.Body className={pagedTenantExams.length === 0 ? '' : 'p-0'}>
                  {tenantExams.length === 0 && (
                    <div className="text-center text-muted small py-3">No exams in this organization yet.</div>
                  )}
                  {tenantExams.length > 0 && filteredTenantExams.length === 0 && (
                    <div className="text-center text-muted small py-3">No exams match your search.</div>
                  )}
                  {pagedTenantExams.length > 0 && (
                    <Table responsive hover className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase bg-light">
                        <tr>
                          <th className="ps-4">Exam</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Questions</th>
                          <th className="pe-4">Created On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTenantExams.map((exam) => (
                          <tr key={exam.id}>
                            <td className="ps-4">
                              <div className="fw-medium">{exam.title}</div>
                              {exam.examCode && (
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                  {exam.examCode}
                                </div>
                              )}
                            </td>
                            <td className="text-muted">{exam.category || '—'}</td>
                            <td>
                              <Badge
                                bg={exam.status === 'Published' ? 'success' : exam.status === 'Archived' ? 'secondary' : 'warning'}
                              >
                                {exam.status}
                              </Badge>
                            </td>
                            <td className="text-muted">{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                            <td className="pe-4">{new Date(exam.createdOn).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>

              {filteredTenantExams.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted small">
                    Showing {examRangeStart} to {examRangeEnd} of {filteredTenantExams.length} exams
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <Pagination className="mb-0">
                      <Pagination.Prev
                        disabled={examCurrentPage === 1}
                        onClick={() => setExamPage((p) => Math.max(1, p - 1))}
                      />
                      {Array.from({ length: examTotalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p} active={p === examCurrentPage} onClick={() => setExamPage(p)}>
                          {p}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next
                        disabled={examCurrentPage === examTotalPages}
                        onClick={() => setExamPage((p) => Math.min(examTotalPages, p + 1))}
                      />
                    </Pagination>
                    <Form.Select
                      size="sm"
                      style={{ width: 100 }}
                      value={examPageSize}
                      onChange={(e) => setExamPageSize(Number(e.target.value))}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} / page
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="col-lg-4">
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Quick Stats</h2>
              <div className="d-flex justify-content-between small py-1">
                <span className="text-muted">Total Users</span>
                <span>{tenantUsers.length}</span>
              </div>
              <div className="d-flex justify-content-between small py-1">
                <span className="text-muted">Total Exams</span>
                <span>{tenantExams.length}</span>
              </div>
              <div className="d-flex justify-content-between small py-1">
                <span className="text-muted">Total Submissions</span>
                <span>&mdash;</span>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Actions</h2>
              <div className="d-flex flex-column gap-2">
                <Button variant="outline-secondary" size="sm" onClick={openEditOrg}>
                  Edit Organization
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={openChangePlan}>
                  Change Plan / Upgrade
                </Button>
                {tenant.isActive ? (
                  <DeactivateTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                ) : (
                  <ReactivateTenantButton tenantId={tenant.id} />
                )}
                {tenant.isTrial ? (
                  <EndTrialButton tenantId={tenant.id} />
                ) : (
                  <StartTrialButton tenantId={tenant.id} tenantName={tenant.name} />
                )}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={tenantAdmins.length === 0}
                  title={tenantAdmins.length === 0 ? 'No admin found for this organization' : undefined}
                  onClick={openResetPassword}
                >
                  Reset Admin Password
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={() => setTab('Activity Log')}>
                  View Activity Log
                </Button>
                <Button variant="outline-danger" size="sm" onClick={openDeleteOrg}>
                  Delete Organization
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Modal show={showAddAdmin} onHide={() => setShowAddAdmin(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Admin to {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createAdminMutation.isError && <Alert variant="danger">{extractServerError(createAdminMutation.error)}</Alert>}
          {createAdminMutation.isSuccess ? (
            <Alert variant="success" className="mb-0">
              Admin created. They can log in at {tenant.slug}.examvaults.in once a password is set.
            </Alert>
          ) : (
            <>
              <Form.Group className="mb-3" controlId="detailAdminFullName">
                <Form.Label>Full Name</Form.Label>
                <Form.Control value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} />
              </Form.Group>
              <Form.Group controlId="detailAdminEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  isInvalid={adminEmail.trim().length > 0 && !isValidEmail(adminEmail)}
                />
                <Form.Control.Feedback type="invalid">Enter a valid email address.</Form.Control.Feedback>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowAddAdmin(false)}>
            {createAdminMutation.isSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!createAdminMutation.isSuccess && (
            <Button
              variant="primary"
              disabled={
                !adminFullName.trim() ||
                !adminEmail.trim() ||
                !isValidEmail(adminEmail) ||
                createAdminMutation.isPending
              }
              onClick={() => createAdminMutation.mutate()}
            >
              {createAdminMutation.isPending ? 'Creating...' : 'Create Admin'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showChangePlan} onHide={() => setShowChangePlan(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Plan for {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {assignPlanMutation.isError && <Alert variant="danger">{extractServerError(assignPlanMutation.error)}</Alert>}
          <Form.Group controlId="changePlanSelect">
            <Form.Label>Plan</Form.Label>
            <Form.Select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
              <option value="" disabled>
                Select a plan...
              </option>
              {plans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowChangePlan(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedPlanId || selectedPlanId === tenant.planId || assignPlanMutation.isPending}
            onClick={() => assignPlanMutation.mutate()}
          >
            {assignPlanMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditOrg} onHide={() => setShowEditOrg(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {updateTenantMutation.isError && <Alert variant="danger">{extractServerError(updateTenantMutation.error)}</Alert>}
          <Form.Group className="mb-3" controlId="editOrgName">
            <Form.Label>Organization Name</Form.Label>
            <Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="editOrgSlug">
            <Form.Label>Subdomain</Form.Label>
            <Form.Control value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase())} />
            <Form.Text className="text-muted">
              {editSlug || 'slug'}.examvaults.in - changing this changes the organization's login URL immediately.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="editOrgCode">
            <Form.Label>Organization Code</Form.Label>
            <Form.Control value={editOrgCode} onChange={(e) => setEditOrgCode(e.target.value)} placeholder="e.g. GFU2026" />
          </Form.Group>
          <Form.Group className="mb-3" controlId="editOrgType">
            <Form.Label>Organization Type</Form.Label>
            <Form.Select value={editOrgType} onChange={(e) => setEditOrgType(e.target.value)}>
              <option value="">Select type</option>
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <h2 className="h6 fw-bold mb-2 mt-4">Address</h2>
          <Row className="g-3 mb-2">
            <Col md={6}>
              <Form.Group controlId="editAddressLine1">
                <Form.Label>Address Line 1</Form.Label>
                <Form.Control value={editAddressLine1} onChange={(e) => setEditAddressLine1(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="editAddressLine2">
                <Form.Label>Address Line 2</Form.Label>
                <Form.Control value={editAddressLine2} onChange={(e) => setEditAddressLine2(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group controlId="editCity">
                <Form.Label>City</Form.Label>
                <Form.Control value={editCity} onChange={(e) => setEditCity(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="editState">
                <Form.Label>State</Form.Label>
                <Form.Control value={editState} onChange={(e) => setEditState(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="editPostalCode">
                <Form.Label>Postal Code</Form.Label>
                <Form.Control value={editPostalCode} onChange={(e) => setEditPostalCode(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="editCountry">
                <Form.Label>Country</Form.Label>
                <Form.Control value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowEditOrg(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!editName.trim() || !editSlug.trim() || updateTenantMutation.isPending}
            onClick={() => updateTenantMutation.mutate()}
          >
            {updateTenantMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showResetPassword} onHide={() => setShowResetPassword(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset Admin Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetPasswordMutation.isError && <Alert variant="danger">{extractServerError(resetPasswordMutation.error)}</Alert>}
          {resetPasswordMutation.isSuccess ? (
            <>
              <Alert variant="success">
                Password reset and emailed to the admin. Temporary password (also shown here in case email delivery
                is delayed):
              </Alert>
              <div className="d-flex gap-2">
                <Form.Control readOnly value={resetPasswordMutation.data ?? ''} className="font-monospace" />
                <Button
                  variant="outline-secondary"
                  onClick={() => navigator.clipboard.writeText(resetPasswordMutation.data ?? '')}
                >
                  Copy
                </Button>
              </div>
              <div className="text-muted small mt-2">
                The admin will be asked to set their own password on next login.
              </div>
            </>
          ) : (
            <Form.Group controlId="resetPasswordAdminSelect">
              <Form.Label>Admin</Form.Label>
              {tenantAdmins.length > 1 ? (
                <Form.Select value={resetTargetAdminId} onChange={(e) => setResetTargetAdminId(e.target.value)}>
                  {tenantAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.fullName} ({admin.email})
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control readOnly value={tenantAdmins[0] ? `${tenantAdmins[0].fullName} (${tenantAdmins[0].email})` : ''} />
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowResetPassword(false)}>
            {resetPasswordMutation.isSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!resetPasswordMutation.isSuccess && (
            <Button
              variant="primary"
              disabled={!resetTargetAdminId || resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteOrg} onHide={() => setShowDeleteOrg(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteTenantMutation.isError && <Alert variant="danger">{extractServerError(deleteTenantMutation.error)}</Alert>}
          <Alert variant="danger">
            This permanently deletes <strong>{tenant.name}</strong> and every one of its users. This cannot be undone.
          </Alert>
          <Form.Group controlId="deleteOrgConfirm">
            <Form.Label>
              Type <strong>{tenant.name}</strong> to confirm.
            </Form.Label>
            <Form.Control value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteOrg(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteConfirmText !== tenant.name || deleteTenantMutation.isPending}
            onClick={() => deleteTenantMutation.mutate()}
          >
            {deleteTenantMutation.isPending ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
