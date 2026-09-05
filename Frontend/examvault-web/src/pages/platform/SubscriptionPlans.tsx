import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Pagination, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { EditIcon, TrashIcon } from '../../components/icons/ActionIcons';
import { useTenants } from '../../hooks/useTenants';
import { createPlan, deletePlan, listPlans, updatePlan } from '../../api/plansApi';
import { extractServerError } from '../../utils/apiError';
import { ALL_PLAN_FEATURES, PLAN_FEATURE_LABELS } from '../../types/plan';
import type { Plan, PlanFeature } from '../../types/plan';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Matches TenantConstants.FullAccessPlanId (Backend/Shared/.../Multitenancy)
// - the one real, seeded Plan every tenant falls back to when created
// without an explicit PlanId (CreateTenantHandler.cs). Not a cosmetic
// "featured plan" pick - this is the actual default, so it gets its own
// pinned callout above the table rather than being just another row in it.
const FULL_ACCESS_PLAN_ID = '33333333-3333-3333-3333-333333333333';

// Real Plan CRUD - replaces the old static reference-pricing cards now that
// a real Plan entity + Tenant.PlanId assignment exists (see ActionPlan.txt's
// "SUBSCRIPTION-BASED FEATURE GATING" section). Billing/pricing stays out of
// scope - a Plan is purely a checklist of included Admin console modules,
// enforced for real on the backend via JWT "feature" claims.
//
// Create/Edit modal redesigned to match Create-new-plan.png: icon badge
// header, a 2-column grid of icon+description module cards instead of a
// flat checkbox list, and a selected-count. The mockup's "Activate Plan"
// toggle is deliberately not included - Plan has no isActive/enabled field
// anywhere in this codebase (every seeded/created plan is always
// assignable), so a toggle here would have nothing real to control.
// Pricing/limit fields are kept as strings in form state (not number|null)
// so an input can be genuinely blank while being edited - trimmed and
// parsed to number|null only when the mutation actually builds its
// request. Blank = unlimited (limits) / not set (pricing), same
// null-means-unlimited convention Tenant's own limit fields already use.
interface PlanFormState {
  name: string;
  description: string;
  includedFeatures: Set<PlanFeature>;
  monthlyPrice: string;
  annualPrice: string;
  maxStudents: string;
  maxAdmins: string;
  maxInstructors: string;
  maxExams: string;
  maxQuestions: string;
  maxAiQuestionsPerMonth: string;
  storageGb: string;
}

const EMPTY_FORM: PlanFormState = {
  name: '',
  description: '',
  includedFeatures: new Set(),
  monthlyPrice: '',
  annualPrice: '',
  maxStudents: '',
  maxAdmins: '',
  maxInstructors: '',
  maxExams: '',
  maxQuestions: '',
  maxAiQuestionsPerMonth: '',
  storageGb: '',
};

// Blank input -> null (unlimited / not set), otherwise the entered number.
function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

function SectionBar({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="d-flex align-items-center gap-2 px-3 py-3 rounded-3 mb-3 bg-primary-subtle">
      <div
        className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
        style={{ width: 36, height: 36, background: '#e0e7ff', color: '#4f46e5' }}
      >
        {icon}
      </div>
      <div>
        <div className="fw-bold">{title}</div>
        <div className="text-muted small">{subtitle}</div>
      </div>
    </div>
  );
}

function RupeeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="18" y2="3" /><line x1="6" y1="8" x2="18" y2="8" />
      <path d="M6 13h3c3 0 5-1.5 5-5" /><path d="M6 13l9 9" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14 15.5 9.5" /><path d="M3.6 15a9 9 0 1 1 16.8 0" />
    </svg>
  );
}

function CrownIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
      <path d="M5 19h14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.7 10.3 12 2l9.3 8.3a1 1 0 0 1 0 1.4L12 22l-9.3-10.3a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}

// Cosmetic per-row icon/color based on a keyword match against the plan's
// own name - deterministic, not stored anywhere. Same convention as
// ManageExamTypes.tsx's iconForExamType. Falls back to a generic shield for
// any custom plan name that doesn't match one of the common tiers.
function iconForPlan(name: string): { icon: ReactNode; iconBg: string; iconColor: string } {
  const lower = name.toLowerCase();
  if (lower.includes('basic') || lower.includes('starter')) return { icon: <LightningIcon />, iconBg: '#dcfce7', iconColor: '#16a34a' };
  if (lower.includes('professional') || lower.includes('pro')) return { icon: <DiamondIcon />, iconBg: '#dbeafe', iconColor: '#2563eb' };
  if (lower.includes('business')) return { icon: <CrownIcon size={18} />, iconBg: '#ede9fe', iconColor: '#7c3aed' };
  if (lower.includes('enterprise')) return { icon: <StarIcon />, iconBg: '#fff7ed', iconColor: '#d97706' };
  return { icon: <ShieldIcon />, iconBg: '#f3f4f6', iconColor: '#4b5563' };
}

interface ModuleInfo {
  feature: PlanFeature;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  description: string;
}

// Icon/color/description per module. Split into 3 groups 2026-09-04
// (matching the plan-editing screen to the same 3-tier model the sidebar/
// backend now enforce, see ActionPlan.txt's "SPLIT LiveMonitoring" plan) -
// GENERAL_MODULES render in their own flat grid unchanged, SECURITY_MODULES
// and MONITORING_MODULES render under their own labeled section headers so
// this screen visually teaches the same distinction that caused the
// original bundled-LiveMonitoring bug, rather than just adding 2 more
// cards to one flat list.
const GENERAL_MODULES: ModuleInfo[] = [
  {
    feature: 'Users',
    icon: <UsersIcon />,
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    description: 'Manage users, roles, permissions and organization members.',
  },
  {
    feature: 'Exams',
    icon: <DocumentIcon />,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    description: 'Create, edit and manage exams, sections and schedules.',
  },
  {
    feature: 'ExamTypes',
    icon: <ListIcon />,
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    description: 'Manage exam categories and type configurations.',
  },
  {
    feature: 'Results',
    icon: <BarChartIcon />,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    description: 'View and analyze results, performance and analytics.',
  },
  {
    feature: 'Reports',
    icon: <PieChartIcon />,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    description: 'Access advanced reports and export capabilities.',
  },
  {
    feature: 'Notifications',
    icon: <BellIcon />,
    iconBg: '#fef9c3',
    iconColor: '#ca8a04',
    description: 'Send email and in-app notifications.',
  },
  {
    feature: 'Settings',
    icon: <GearIcon />,
    iconBg: '#f3f4f6',
    iconColor: '#4b5563',
    description: 'Configure system settings and general preferences.',
  },
];

const SECURITY_MODULES: ModuleInfo[] = [
  {
    feature: 'ExamSecurity',
    icon: <ShieldCheckIcon />,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    description: 'Tab-switch and copy/paste detection, fullscreen enforcement, and security violation tracking.',
  },
];

const MONITORING_MODULES: ModuleInfo[] = [
  {
    feature: 'LiveMonitoring',
    icon: <MonitorIcon />,
    iconBg: '#ffedd5',
    iconColor: '#ea580c',
    description: 'Track active exams, student attempts and real-time progress - no camera access.',
  },
  {
    feature: 'Proctoring',
    icon: <CameraIcon />,
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    description: 'Webcam monitoring, live camera watch, recording and playback review.',
  },
];

function renderModuleCard(mod: ModuleInfo, includedFeatures: Set<PlanFeature>, toggleFeature: (feature: PlanFeature) => void) {
  const checked = includedFeatures.has(mod.feature);
  return (
    <Col xs={12} md={6} key={mod.feature}>
      <label
        className={`d-flex align-items-start gap-2 border rounded-3 p-3 mb-0${checked ? ' bg-primary-subtle' : ''}`}
        style={{
          cursor: 'pointer',
          borderColor: checked ? '#4f46e5' : undefined,
        }}
      >
        <Form.Check type="checkbox" className="mt-1" checked={checked} onChange={() => toggleFeature(mod.feature)} />
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 40, height: 40, background: mod.iconBg, color: mod.iconColor }}
        >
          {mod.icon}
        </div>
        <div>
          <div className="fw-medium">{PLAN_FEATURE_LABELS[mod.feature]}</div>
          <div className="text-muted small">{mod.description}</div>
        </div>
      </label>
    </Col>
  );
}

export default function SubscriptionPlans() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading, isError } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  // Same cross-tenant list OrganizationDetails.tsx/ManageTenants.tsx already
  // fetch (useTenants dedupes the query) - used only to compute each plan's
  // real "Organizations" count, not fetched again here.
  const { data: tenants } = useTenants();

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const organizationCountByPlanId = useMemo(() => {
    const map = new Map<string, number>();
    (tenants ?? []).forEach((t) => map.set(t.planId, (map.get(t.planId) ?? 0) + 1));
    return map;
  }, [tenants]);

  const defaultPlan = plans?.find((p) => p.id === FULL_ACCESS_PLAN_ID) ?? null;

  const searchQuery = searchText.trim().toLowerCase();
  const otherPlans = useMemo(() => {
    return (plans ?? [])
      .filter((p) => p.id !== FULL_ACCESS_PLAN_ID)
      .filter(
        (p) =>
          !searchQuery ||
          p.name.toLowerCase().includes(searchQuery) ||
          (p.description ?? '').toLowerCase().includes(searchQuery),
      );
  }, [plans, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(otherPlans.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPlans = otherPlans.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = otherPlans.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, otherPlans.length);

  const saveMutation = useMutation({
    mutationFn: () => {
      const request = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        includedFeatures: [...form.includedFeatures],
        monthlyPrice: parseOptionalNumber(form.monthlyPrice),
        annualPrice: parseOptionalNumber(form.annualPrice),
        maxStudents: parseOptionalNumber(form.maxStudents),
        maxAdmins: parseOptionalNumber(form.maxAdmins),
        maxInstructors: parseOptionalNumber(form.maxInstructors),
        maxExams: parseOptionalNumber(form.maxExams),
        maxQuestions: parseOptionalNumber(form.maxQuestions),
        maxAiQuestionsPerMonth: parseOptionalNumber(form.maxAiQuestionsPerMonth),
        storageGb: parseOptionalNumber(form.storageGb),
      };
      return editingPlan ? updatePlan(editingPlan.id, request) : createPlan(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    saveMutation.reset();
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (plan: Plan) => {
    saveMutation.reset();
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      includedFeatures: new Set(plan.includedFeatures),
      monthlyPrice: plan.monthlyPrice?.toString() ?? '',
      annualPrice: plan.annualPrice?.toString() ?? '',
      maxStudents: plan.maxStudents?.toString() ?? '',
      maxAdmins: plan.maxAdmins?.toString() ?? '',
      maxInstructors: plan.maxInstructors?.toString() ?? '',
      maxExams: plan.maxExams?.toString() ?? '',
      maxQuestions: plan.maxQuestions?.toString() ?? '',
      maxAiQuestionsPerMonth: plan.maxAiQuestionsPerMonth?.toString() ?? '',
      storageGb: plan.storageGb?.toString() ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const toggleFeature = (feature: PlanFeature) => {
    setForm((prev) => {
      const next = new Set(prev.includedFeatures);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return { ...prev, includedFeatures: next };
    });
  };

  return (
    <PlatformLayout active="subs-plans">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Subscriptions / Plans</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Plans</h1>
          <p className="text-muted mb-0">
            Each plan is a checklist of Admin console modules - enforced on the backend, not just hidden in the UI.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Create Plan
        </Button>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load plans. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          {defaultPlan && (
            <Card className="border-0 shadow-sm mb-3 bg-primary-subtle">
              <Card.Body>
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: 44, height: 44, background: '#ede9fe', color: '#7c3aed' }}
                  >
                    <CrownIcon />
                  </div>
                  <div className="flex-grow-1">
                    <h2 className="h6 fw-bold mb-1">{defaultPlan.name}</h2>
                    {defaultPlan.description && <p className="text-muted small mb-2">{defaultPlan.description}</p>}
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {defaultPlan.includedFeatures.map((f) => (
                        <Badge key={f} bg="light" text="dark" className="border">
                          {PLAN_FEATURE_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="d-inline-flex align-items-center gap-1"
                        onClick={() => openEdit(defaultPlan)}
                      >
                        <EditIcon /> Edit Plan
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="d-inline-flex align-items-center gap-1"
                        onClick={() => setDeleteTarget(defaultPlan)}
                      >
                        <TrashIcon /> Delete Plan
                      </Button>
                    </div>
                    <div className="text-muted mt-2" style={{ fontSize: 11.5 }}>
                      Created by {defaultPlan.createdByName ?? '—'}
                      {defaultPlan.updatedByName && (
                        <> · Last updated by {defaultPlan.updatedByName} on {new Date(defaultPlan.updatedAtUtc).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-2">
            <div>
              <h2 className="h6 fw-bold mb-1">All Plans</h2>
              <p className="text-muted small mb-0">Manage subscription plans and their permissions.</p>
            </div>
            <InputGroup style={{ width: 260 }}>
              <InputGroup.Text>
                <SearchIcon />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search plans..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </InputGroup>
          </div>

          {otherPlans.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center text-muted py-5">
                {searchQuery ? 'No plans match your search.' : 'No other plans yet. Click "+ Create Plan" to add one.'}
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-3">
              {pagedPlans.map((plan) => {
                const style = iconForPlan(plan.name);
                const shown = plan.includedFeatures.slice(0, 3);
                const remaining = plan.includedFeatures.length - shown.length;
                const orgCount = organizationCountByPlanId.get(plan.id) ?? 0;
                const limitStats: { label: string; value: number | null }[] = [
                  { label: 'Students', value: plan.maxStudents },
                  { label: 'Admins', value: plan.maxAdmins },
                  { label: 'Instructors', value: plan.maxInstructors },
                  { label: 'Exams', value: plan.maxExams },
                ];
                return (
                  <Col xs={12} md={6} xl={4} key={plan.id}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                              style={{ width: 40, height: 40, background: style.iconBg, color: style.iconColor }}
                            >
                              {style.icon}
                            </div>
                            <div>
                              <div className="fw-bold">{plan.name}</div>
                              <div className="text-muted small">
                                {orgCount} organization{orgCount === 1 ? '' : 's'}
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-1 flex-shrink-0">
                            <Button variant="outline-secondary" size="sm" onClick={() => openEdit(plan)} title="Edit plan">
                              <EditIcon />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => setDeleteTarget(plan)} title="Delete plan">
                              <TrashIcon />
                            </Button>
                          </div>
                        </div>

                        {plan.description && <p className="text-muted small mb-3">{plan.description}</p>}

                        <div className="d-flex align-items-baseline gap-1 mb-3">
                          {plan.monthlyPrice !== null ? (
                            <>
                              <span className="h4 fw-bold mb-0">₹{plan.monthlyPrice.toLocaleString('en-IN')}</span>
                              <span className="text-muted small">/ month</span>
                            </>
                          ) : (
                            <span className="h5 fw-bold mb-0 text-muted">Custom pricing</span>
                          )}
                          {plan.annualPrice !== null && (
                            <span className="text-muted small ms-1">
                              (₹{plan.annualPrice.toLocaleString('en-IN')} billed annually)
                            </span>
                          )}
                        </div>

                        <Row className="g-2 mb-3">
                          {limitStats.map((stat) => (
                            <Col xs={3} key={stat.label}>
                              <div className="text-center border rounded-3 py-2 bg-body-tertiary">
                                <div className="fw-bold small">{stat.value ?? '∞'}</div>
                                <div className="text-muted" style={{ fontSize: 10 }}>
                                  {stat.label}
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>

                        <div className="d-flex flex-wrap gap-1 mt-auto">
                          {shown.length === 0 ? (
                            <span className="text-muted small">No modules included</span>
                          ) : (
                            shown.map((f) => (
                              <Badge key={f} bg="light" text="dark" className="border fw-normal">
                                {PLAN_FEATURE_LABELS[f]}
                              </Badge>
                            ))
                          )}
                          {remaining > 0 && (
                            <Badge bg="light" text="dark" className="border fw-normal">
                              +{remaining} more
                            </Badge>
                          )}
                        </div>

                        <div className="text-muted mt-2 pt-2 border-top" style={{ fontSize: 11.5 }}>
                          <div>Created by {plan.createdByName ?? '—'}</div>
                          {plan.updatedByName && (
                            <div>
                              Last updated by {plan.updatedByName} on {new Date(plan.updatedAtUtc).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}

          {otherPlans.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {otherPlans.length} plans
              </div>
              <div className="d-flex align-items-center gap-3">
                <Pagination className="mb-0">
                  <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                      {p}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </Pagination>
                <Form.Select size="sm" style={{ width: 100 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
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

      <Modal show={showForm} onHide={closeForm} centered size="lg">
        <Modal.Header closeButton>
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 48, height: 48, background: '#eef2ff', color: '#4f46e5' }}
            >
              <CrownIcon />
            </div>
            <div>
              <Modal.Title>{editingPlan ? `Edit ${editingPlan.name}` : 'Create New Plan'}</Modal.Title>
              <div className="text-muted small">Define plan details and select the modules to include.</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          {saveMutation.isError && <Alert variant="danger">{extractServerError(saveMutation.error)}</Alert>}

          <div className="fw-bold mb-3">Plan Information</div>
          <Form.Group className="mb-3" controlId="planName">
            <Form.Label>
              Plan Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter plan name"
            />
            <Form.Text className="text-muted">Choose a clear and recognizable name for this plan.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-4" controlId="planDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter plan description"
            />
            <Form.Text className="text-muted">Describe the plan, its purpose and who it's intended for.</Form.Text>
          </Form.Group>

          <SectionBar icon={<RupeeIcon />} title="Pricing & Billing" subtitle="Reference pricing shown to Super Admins - not connected to any payment provider yet." />
          <Row className="mb-4">
            <Col md={6}>
              <Form.Group className="mb-3" controlId="planMonthlyPrice">
                <Form.Label className="fw-bold small">Monthly Price (₹)</Form.Label>
                <InputGroup>
                  <InputGroup.Text>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={0}
                    value={form.monthlyPrice}
                    onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                    placeholder="Leave blank for no price"
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="planAnnualPrice">
                <Form.Label className="fw-bold small">Annual Price (₹)</Form.Label>
                <InputGroup>
                  <InputGroup.Text>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={0}
                    value={form.annualPrice}
                    onChange={(e) => setForm({ ...form, annualPrice: e.target.value })}
                    placeholder="Leave blank for no price"
                  />
                </InputGroup>
                {(() => {
                  const monthly = parseOptionalNumber(form.monthlyPrice);
                  const annual = parseOptionalNumber(form.annualPrice);
                  if (monthly === null || annual === null || monthly <= 0) return null;
                  const savingsPct = Math.round((1 - annual / (monthly * 12)) * 100);
                  return savingsPct > 0 ? (
                    <Form.Text className="text-success">Annual billing saves ~{savingsPct}% vs. paying monthly.</Form.Text>
                  ) : null;
                })()}
              </Form.Group>
            </Col>
          </Row>

          <SectionBar icon={<GaugeIcon />} title="Usage Limits" subtitle="Leave a field blank for unlimited. These become each organization's effective limits when this plan is assigned." />
          <Row className="mb-2">
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planMaxStudents">
                <Form.Label className="fw-bold small">Max Students</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.maxStudents}
                  onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planMaxAdmins">
                <Form.Label className="fw-bold small">Max Admins</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.maxAdmins}
                  onChange={(e) => setForm({ ...form, maxAdmins: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planMaxInstructors">
                <Form.Label className="fw-bold small">Max Instructors</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.maxInstructors}
                  onChange={(e) => setForm({ ...form, maxInstructors: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planMaxExams">
                <Form.Label className="fw-bold small">Max Exams</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.maxExams}
                  onChange={(e) => setForm({ ...form, maxExams: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planMaxQuestions">
                <Form.Label className="fw-bold small">Max Questions</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.maxQuestions}
                  onChange={(e) => setForm({ ...form, maxQuestions: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planMaxAiQuestions">
                <Form.Label className="fw-bold small">AI Questions / Month</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.maxAiQuestionsPerMonth}
                  onChange={(e) => setForm({ ...form, maxAiQuestionsPerMonth: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="planStorageGb">
                <Form.Label className="fw-bold small">Storage (GB)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.storageGb}
                  onChange={(e) => setForm({ ...form, storageGb: e.target.value })}
                  placeholder="Unlimited"
                />
              </Form.Group>
            </Col>
          </Row>
          <Alert variant="light" className="border small mb-4 d-flex align-items-start gap-2">
            <span className="text-muted flex-shrink-0" style={{ marginTop: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <span>
              Students, Admins, Instructors and Exams are enforced when an organization tries to create a new one.{' '}
              <strong>Questions, AI Questions/Month and Storage GB are saved and shown only</strong> - they are not yet
              enforced anywhere in the product.
            </span>
          </Alert>

          <div className="d-flex justify-content-between align-items-center mb-1">
            <div className="fw-bold">Included Modules</div>
            <div className="text-muted small">
              {form.includedFeatures.size} of {ALL_PLAN_FEATURES.length} selected
            </div>
          </div>
          <p className="text-muted small mb-3">Select the modules and features that will be available in this plan.</p>

          <Row className="g-2 mb-3">{GENERAL_MODULES.map((mod) => renderModuleCard(mod, form.includedFeatures, toggleFeature))}</Row>

          <div className="text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>
            Exam Security
          </div>
          <Row className="g-2 mb-3">{SECURITY_MODULES.map((mod) => renderModuleCard(mod, form.includedFeatures, toggleFeature))}</Row>

          <div className="text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>
            Monitoring &amp; Proctoring
          </div>
          <Row className="g-2 mb-3">{MONITORING_MODULES.map((mod) => renderModuleCard(mod, form.includedFeatures, toggleFeature))}</Row>

          <Alert variant="light" className="border small mb-0 d-flex align-items-start gap-2">
            <span className="text-primary flex-shrink-0" style={{ marginTop: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            Super Admin has full access to all modules regardless of the plan.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeForm}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={deleteTarget !== null} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Plan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteMutation.isError && <Alert variant="danger">{extractServerError(deleteMutation.error)}</Alert>}
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Organizations still assigned to it
          will block this until they're moved to a different plan first.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
