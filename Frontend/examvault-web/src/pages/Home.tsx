import type { ReactNode } from 'react';
import { Accordion, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import type { AuthMode } from '../components/AuthModal';
import { listPublicPlans } from '../api/plansApi';
import { PLAN_FEATURE_LABELS } from '../types/plan';
import type { Plan } from '../types/plan';

const PURPLE = '#4f46e5';

function Icon({ children, color, size = 20 }: { children: ReactNode; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function IconBadge({ children, bg, color, size = 44 }: { children: ReactNode; bg: string; color: string; size?: number }) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
      style={{ width: size, height: size, background: bg }}
    >
      <Icon color={color} size={Math.round(size * 0.45)}>{children}</Icon>
    </span>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="badge rounded-pill mb-2 px-3 py-1"
      style={{ background: '#eef2ff', color: PURPLE, fontWeight: 600, letterSpacing: 0.3, fontSize: 12 }}
    >
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="fw-bold">{title}</h2>
      {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
    </div>
  );
}

// ---- Hero ----------------------------------------------------------------

interface HeroChip {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

const heroChips: HeroChip[] = [
  {
    title: 'Easy to Use',
    subtitle: 'Simple for everyone',
    icon: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />,
  },
  {
    title: 'Secure & Reliable',
    subtitle: 'Your data is safe',
    icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
  },
  {
    title: 'Real-time Results',
    subtitle: 'Instant insights',
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
  {
    title: 'Dedicated Support',
    subtitle: "We're here to help",
    icon: (
      <>
        <path d="M3 14v-3a9 9 0 0118 0v3" />
        <path d="M21 15a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2v1Z" />
        <path d="M3 15a2 2 0 002 2h1v-5H5a2 2 0 00-2 2v1Z" />
      </>
    ),
  },
];

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

// Trust-strip icons below the hero - deliberately generic ("Built for
// Institutions of Every Size"), not a specific customer count, since no
// real, current figure was confirmed for this page.
const institutionTypes: { label: string; icon: ReactNode }[] = [
  { label: 'Colleges', icon: <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /></> },
  { label: 'Institutes', icon: <><rect x="4" y="2" width="16" height="20" rx="1" /><line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" /></> },
  { label: 'Training Centers', icon: <><rect x="2" y="4" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="18" x2="12" y2="21" /></> },
  { label: 'Universities', icon: <><path d="M3 21h18" /><path d="M5 21V9l7-6 7 6v12" /><path d="M9 21v-6h6v6" /></> },
];

function FloatingCallout({
  icon,
  bg,
  color,
  text,
  style,
}: {
  icon: ReactNode;
  bg: string;
  color: string;
  text: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="position-absolute bg-white rounded-3 p-2 d-none d-md-flex align-items-center gap-2"
      style={{ boxShadow: 'var(--shadow-soft-hover)', maxWidth: 150, ...style }}
    >
      <IconBadge bg={bg} color={color} size={34}>{icon}</IconBadge>
      <span className="fw-bold" style={{ fontSize: 11, lineHeight: 1.2 }}>{text}</span>
    </div>
  );
}

// Purely decorative product-preview sketch - not wired to live data, just a
// marketing illustration. Deliberately an illustration rather than a stock
// photo of a person (no licensed photo asset available for this page).
function HeroVisual() {
  return (
    <div className="position-relative" style={{ paddingBottom: 44 }}>
      <div className="rounded-4 shadow-lg bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom" style={{ background: '#fafaff' }}>
          <span className="d-flex align-items-center gap-2 fw-bold small">
            <span className="d-inline-flex align-items-center justify-content-center rounded-2" style={{ width: 22, height: 22, background: PURPLE }}>
              <Icon color="white" size={13}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Icon>
            </span>
            ExamVault
          </span>
          <span className="d-flex align-items-center gap-2">
            <Icon color="#9ca3af" size={16}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /></Icon>
            <span className="rounded-circle" style={{ width: 22, height: 22, background: PURPLE }} />
          </span>
        </div>
        <div className="p-3">
          <div className="fw-bold small mb-1">Welcome back!</div>
          <div className="text-muted mb-3" style={{ fontSize: 11 }}>Manage your examination with ease</div>
          <Row className="g-2 mb-3">
            {[
              { label: 'Active Exams', value: '12', color: PURPLE },
              { label: 'Total Students', value: '248', color: '#2563eb' },
              { label: 'Avg Score', value: '96%', color: '#16a34a' },
            ].map((s) => (
              <Col xs={4} key={s.label}>
                <div className="rounded-3 p-2 text-center" style={{ background: '#f8f9fb' }}>
                  <div className="fw-bold" style={{ color: s.color, fontSize: 15 }}>{s.value}</div>
                  <div className="text-muted" style={{ fontSize: 9 }}>{s.label}</div>
                </div>
              </Col>
            ))}
          </Row>
          <div className="fw-bold mb-2" style={{ fontSize: 11 }}>Exam Performance</div>
          <div className="d-flex align-items-end gap-1 mb-3" style={{ height: 46 }}>
            {[40, 65, 50, 80, 60, 90].map((h, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="rounded-1 flex-grow-1" style={{ height: Math.round((h / 100) * 46), background: i === 5 ? PURPLE : '#e0e7ff' }} />
            ))}
          </div>
          <div className="fw-bold mb-2" style={{ fontSize: 11 }}>Recent Exams</div>
          {[
            { name: 'Data Structures - Unit Test', status: 'Active', color: '#16a34a', bg: '#dcfce7' },
            { name: 'Aptitude Mock Test', status: 'Completed', color: '#6b7280', bg: '#f3f4f6' },
          ].map((e) => (
            <div key={e.name} className="d-flex align-items-center justify-content-between py-1">
              <span style={{ fontSize: 11 }}>{e.name}</span>
              <span className="badge rounded-pill" style={{ background: e.bg, color: e.color, fontWeight: 500, fontSize: 9 }}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FloatingCallout
        icon={<><path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>}
        bg="#eef2ff"
        color={PURPLE}
        text="Create Exams in Minutes"
        style={{ top: -16, left: -12 }}
      />
      <FloatingCallout
        icon={<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>}
        bg="#ecfdf5"
        color="#16a34a"
        text="Instant Results & Analytics"
        style={{ top: 40, right: -20 }}
      />
      <FloatingCallout
        icon={<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>}
        bg="#fee2e2"
        color="#dc2626"
        text="Secure & Cheat-Resistant"
        style={{ bottom: -28, right: -16 }}
      />
    </div>
  );
}

// ---- Trust strip (below hero) ---------------------------------------------

interface TrustItem {
  title: string;
  subtitle: string;
  bg: string;
  color: string;
  icon: ReactNode;
}

const trustItems: TrustItem[] = [
  {
    title: 'AI-Powered Question Generation',
    subtitle: 'Create high-quality questions in seconds',
    bg: '#eef2ff',
    color: PURPLE,
    icon: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" />,
  },
  {
    title: 'Instant Grading',
    subtitle: 'Get results immediately',
    bg: '#eef6ff',
    color: '#2563eb',
    icon: <><polyline points="20 6 9 17 4 12" /></>,
  },
  {
    title: 'Secure Exams',
    subtitle: 'Advanced security controls',
    bg: '#ecfdf5',
    color: '#16a34a',
    icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
  },
  {
    title: 'Real-Time Analytics',
    subtitle: 'Track performance instantly',
    bg: '#eef2ff',
    color: PURPLE,
    icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  },
];

// ---- Features ---------------------------------------------------------

interface Feature {
  title: string;
  description: string;
  caption: string;
  bg: string;
  color: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    title: 'AI Question Generation',
    description: 'Create high-quality questions instantly using AI.',
    caption: 'Save time and improve quality.',
    bg: '#eef2ff',
    color: PURPLE,
    icon: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" />,
  },
  {
    title: 'Exam Management',
    description: 'Create and schedule exams with flexible settings.',
    caption: 'Supports multiple exam types.',
    bg: '#eff6ff',
    color: '#2563eb',
    icon: <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
  },
  {
    title: 'Question Bank',
    description: 'Build and organize a reusable question bank.',
    caption: 'Categorize, tag and search easily.',
    bg: '#ecfdf5',
    color: '#0d9488',
    icon: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" /><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></>,
  },
  {
    title: 'Automated Evaluation',
    description: 'Get instant results with detailed analysis.',
    caption: 'Reduce manual work.',
    bg: '#ecfdf5',
    color: '#16a34a',
    icon: <><circle cx="12" cy="12" r="9" /><polyline points="8 12 11 15 16 9" /></>,
  },
  {
    title: 'Live Monitoring',
    description: 'Monitor exams in real-time for better integrity.',
    caption: 'Ensure a fair testing environment.',
    bg: '#f3e8ff',
    color: '#7c3aed',
    icon: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></>,
  },
  {
    title: 'Analytics & Reports',
    description: 'Gain insights with comprehensive reports.',
    caption: 'Track performance and trends.',
    bg: '#eff6ff',
    color: '#2563eb',
    icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  },
];

// ---- How it works -------------------------------------------------------

interface Step {
  step: number;
  title: string;
  description: string;
  icon: ReactNode;
}

const steps: Step[] = [
  {
    step: 1,
    title: 'Create',
    description: 'Set up your exam with questions and settings.',
    icon: <><rect x="4" y="9" width="16" height="12" /><path d="M9 21V13a3 3 0 016 0v8" /><path d="M4 9l8-6 8 6" /></>,
  },
  {
    step: 2,
    title: 'Conduct',
    description: 'Invite students and run the exam securely.',
    icon: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  },
  {
    step: 3,
    title: 'Evaluate',
    description: 'Get instant results and detailed analytics.',
    icon: <><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /><path d="m9 12 2 2 4-4" /></>,
  },
  {
    step: 4,
    title: 'Improve',
    description: 'Use insights to optimize performance.',
    icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  },
];

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ---- Built for everyone --------------------------------------------------

interface Audience {
  title: string;
  description: string;
  bg: string;
  color: string;
  icon: ReactNode;
}

const audiences: Audience[] = [
  {
    title: 'Institutions',
    description: 'Colleges, universities and schools can manage internal and external examinations with ease.',
    bg: '#eef2ff',
    color: PURPLE,
    icon: <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /></>,
  },
  {
    title: 'Educators',
    description: 'Teachers and trainers can create engaging exams and track student performance effectively.',
    bg: '#ecfdf5',
    color: '#0d9488',
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></>,
  },
  {
    title: 'Students',
    description: 'A smooth and secure exam experience across devices, anytime, anywhere.',
    bg: '#fff7ed',
    color: '#ea580c',
    icon: <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /><path d="M12 15v6" /></>,
  },
];

// ---- Pricing teaser -------------------------------------------------------
// Real data from GET /api/plans/public (anonymous, excludes the internal
// "Full Access" default plan server-side) - not hardcoded marketing copy.
// No "Most Popular" badge: Plan has no real "featured" field to back one,
// and guessing would be dishonest.

function planPriceDisplay(plan: Plan): { price: string; period: string } {
  if (plan.monthlyPrice === null) {
    return { price: 'Custom Pricing', period: 'Talk to our team' };
  }
  if (plan.monthlyPrice === 0) {
    return { price: '₹0', period: 'Forever free' };
  }
  const period =
    plan.annualPrice !== null
      ? `/ month (₹${plan.annualPrice.toLocaleString('en-IN')} / year)`
      : '/ month';
  return { price: `₹${plan.monthlyPrice.toLocaleString('en-IN')}`, period };
}

function planBullets(plan: Plan): string[] {
  const bullets = [
    `${plan.maxStudents === null ? 'Unlimited' : `Up to ${plan.maxStudents.toLocaleString('en-IN')}`} students`,
    `${plan.maxExams === null ? 'Unlimited' : plan.maxExams.toLocaleString('en-IN')} exams`,
  ];
  const shownFeatures = plan.includedFeatures.slice(0, 2);
  bullets.push(...shownFeatures.map((f) => PLAN_FEATURE_LABELS[f]));
  const remaining = plan.includedFeatures.length - shownFeatures.length;
  if (remaining > 0) bullets.push(`+${remaining} more feature${remaining === 1 ? '' : 's'}`);
  return bullets;
}

function planCta(plan: Plan): { label: string; to: string } {
  return plan.monthlyPrice === null && plan.annualPrice === null
    ? { label: 'Contact Us', to: '/contact' }
    : { label: 'Get Started', to: '/register' };
}

// Cheapest first, custom-pricing (null) plans last - real DB order otherwise
// has no particular meaning for a marketing page.
function sortByPrice(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => (a.monthlyPrice ?? Infinity) - (b.monthlyPrice ?? Infinity));
}

// ---- Security -------------------------------------------------------------

interface SecurityItem {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

const securityItems: SecurityItem[] = [
  {
    title: 'Secure Authentication',
    subtitle: 'Robust access controls and user management.',
    icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
  },
  {
    title: 'Proctoring & Monitoring',
    subtitle: 'Live monitoring tools to ensure exam integrity.',
    icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
  },
  {
    title: 'Anti-Cheating Controls',
    subtitle: 'Multiple layers of protection during exams.',
    icon: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><polyline points="3 6 4 7 6 5" /><polyline points="3 12 4 13 6 11" /><polyline points="3 18 4 19 6 17" /></>,
  },
  {
    title: 'Data Privacy',
    subtitle: 'Your data is secure and always protected.',
    icon: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" /><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></>,
  },
];

// ---- FAQ --------------------------------------------------------------
// Real, honest answers about what this product actually does - not
// marketing filler (e.g. the question-type count below matches
// QuestionType.cs's real 8 values).

const faqs: { question: string; answer: string }[] = [
  {
    question: 'What types of exams can I create?',
    answer:
      'ExamVault supports 8 question types - Multiple Choice, True/False, Short Answer, Fill in the Blank, Match the Following, Coding, Essay and Multi-Select - so you can build anything from a quick quiz to a full coding assessment.',
  },
  {
    question: 'Can I use ExamVault for my college or institute?',
    answer:
      'Yes. ExamVault is built for multi-tenant use - colleges, universities, coaching institutes and corporate training teams each get their own isolated organization with their own admins, students and exams.',
  },
  {
    question: 'Is there a free plan available?',
    answer: 'Yes - the Free plan is forever free and includes essential features to get started, no credit card required.',
  },
  {
    question: 'How secure is the platform?',
    answer:
      'Every exam is protected by role-based access control, secure authentication, real-time proctoring and live monitoring, and detailed security-violation tracking - all enforced on the backend, not just hidden in the UI.',
  },
];

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: plans, isLoading: plansLoading, isError: plansError } = useQuery({
    queryKey: ['public-plans'],
    queryFn: listPublicPlans,
  });

  const mode: AuthMode | null =
    location.pathname === '/login' ? 'login' : location.pathname === '/register' ? 'register' : null;

  return (
    <div>
      <NavBar />

      {/* Hero */}
      <Container className="pt-5 pb-4">
        <Row className="align-items-center g-5">
          <Col lg={6}>
            <span className="badge rounded-pill mb-3" style={{ background: '#eef2ff', color: PURPLE }}>
              Built for Colleges &amp; Institutes
            </span>
            <h1 className="display-5 fw-bold mb-3">
              Modern Examination
              <br />
              <span style={{ color: PURPLE }}>Management Made Simple</span>
            </h1>
            <p className="text-muted fs-5 mb-4">
              ExamVault is a secure, scalable and intelligent online examination platform for colleges,
              institutes, coaching centers and educational organizations. Create exams, conduct them securely,
              evaluate instantly and get powerful insights - all in one place.
            </p>
            <div className="d-flex flex-wrap gap-3 mb-4">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started Free &rarr;
              </Link>
              <Link to="/contact" className="btn btn-outline-secondary btn-lg d-inline-flex align-items-center gap-2">
                <PlayIcon /> Watch Demo
              </Link>
            </div>
            <Row className="g-3">
              {heroChips.map((chip) => (
                <Col xs={6} key={chip.title} className="d-flex align-items-center gap-2">
                  <IconBadge bg="#eef2ff" color={PURPLE} size={36}>{chip.icon}</IconBadge>
                  <div>
                    <div className="fw-bold" style={{ fontSize: 13 }}>{chip.title}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{chip.subtitle}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
          <Col lg={6}>
            <HeroVisual />
          </Col>
        </Row>
      </Container>

      {/* Trusted-by strip */}
      <Container className="pb-5">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border rounded-4 shadow-sm p-4">
          <span className="fw-bold text-muted small text-uppercase">Trusted by Leading Educational Institutions</span>
          <div className="d-flex flex-wrap gap-4">
            {institutionTypes.map((t) => (
              <span key={t.label} className="d-flex align-items-center gap-2 text-muted small fw-medium">
                <Icon color="#6b7280" size={18}>{t.icon}</Icon>
                {t.label}
              </span>
            ))}
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">Built for Institutions of Every Size</span>
            <Link to="/about" style={{ color: PURPLE, fontWeight: 500 }} className="small text-decoration-none text-nowrap">
              View Success Stories &rarr;
            </Link>
          </div>
        </div>
      </Container>

      {/* Trust strip */}
      <Container className="pb-5">
        <Row className="g-4 bg-white border rounded-4 shadow-sm p-4 mx-0">
          {trustItems.map((item) => (
            <Col key={item.title} xs={12} sm={6} lg={3} className="d-flex align-items-start gap-3">
              <IconBadge bg={item.bg} color={item.color} size={40}>{item.icon}</IconBadge>
              <div>
                <div className="fw-bold small">{item.title}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{item.subtitle}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Features */}
      <Container id="features" className="pb-5">
        <SectionHeading
          eyebrow="Features"
          title="Everything You Need for Modern Assessments"
          subtitle="Powerful tools to create, manage, conduct and analyze exams - all in one place."
        />
        <Row className="g-4">
          {features.map((feature) => (
            <Col key={feature.title} sm={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="mb-3"><IconBadge bg={feature.bg} color={feature.color}>{feature.icon}</IconBadge></div>
                  <Card.Title as="h6" className="fw-bold">
                    {feature.title}
                  </Card.Title>
                  <Card.Text className="text-muted small mb-1">{feature.description}</Card.Text>
                  <Card.Text className="text-muted small mb-0">{feature.caption}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* How it works */}
      <Container fluid className="px-0 py-5" style={{ background: '#f5f5ff' }}>
        <Container>
          <SectionHeading
            eyebrow="How It Works"
            title="From Setup to Results in Minutes"
            subtitle="A simple and streamlined process to get your exams up and running."
          />
          <Row className="g-4 align-items-start justify-content-center">
            {steps.map((step, i) => (
              <Col key={step.title} xs={12} sm={6} lg="auto" className="d-flex align-items-center">
                <div className="text-center" style={{ width: 170 }}>
                  <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold text-white"
                      style={{ width: 32, height: 32, background: PURPLE, fontSize: 14 }}
                    >
                      {step.step}
                    </span>
                    <IconBadge bg="white" color={PURPLE} size={40}>{step.icon}</IconBadge>
                  </div>
                  <div className="fw-bold">{step.title}</div>
                  <div className="text-muted small">{step.description}</div>
                </div>
                {i < steps.length - 1 && (
                  <div className="d-none d-lg-block mx-2">
                    <ChevronRight />
                  </div>
                )}
              </Col>
            ))}
          </Row>
        </Container>
      </Container>

      {/* Built for everyone */}
      <Container className="py-5">
        <SectionHeading
          eyebrow="Built for Everyone"
          title="Designed for Every Educational Need"
          subtitle="Whether you're a college, a coaching institute or a corporate training team, ExamVault adapts to your needs."
        />
        <Row className="g-4">
          {audiences.map((audience) => (
            <Col key={audience.title} md={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="mb-3"><IconBadge bg={audience.bg} color={audience.color} size={48}>{audience.icon}</IconBadge></div>
                  <Card.Title as="h6" className="fw-bold">
                    {audience.title}
                  </Card.Title>
                  <Card.Text className="text-muted small mb-3">{audience.description}</Card.Text>
                  <Link to="/about" style={{ color: PURPLE, fontWeight: 500 }} className="small text-decoration-none">
                    Learn more &rarr;
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Pricing teaser - real Plan data from GET /api/plans/public */}
      <Container fluid className="px-0 py-5" style={{ background: '#f5f5ff' }}>
        <Container>
          <SectionHeading
            eyebrow="Simple & Transparent"
            title="Choose the Right Plan for Your Organization"
            subtitle="Flexible plans for institutions of all sizes."
          />
          {plansLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}
          {plansError && (
            <div className="text-center text-danger py-4">Couldn't load pricing right now. Please try again shortly.</div>
          )}
          {!plansLoading && !plansError && plans && plans.length === 0 && (
            <div className="text-center text-muted py-4">Pricing plans are being finalized - check back soon.</div>
          )}
          {!plansLoading && !plansError && plans && plans.length > 0 && (
            <>
              <Row className="g-4">
                {sortByPrice(plans).map((plan) => {
                  const { price, period } = planPriceDisplay(plan);
                  const cta = planCta(plan);
                  return (
                    <Col key={plan.id} xs={12} sm={6} lg={3}>
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="d-flex flex-column">
                          <div className="fw-bold mb-1">{plan.name}</div>
                          <div className="text-muted small mb-3">{plan.description ?? ' '}</div>
                          <div className="mb-1">
                            <span className="h4 fw-bold mb-0">{price}</span>
                          </div>
                          <div className="text-muted small mb-3">{period}</div>
                          <Link to={cta.to} className="btn btn-outline-secondary mb-3">
                            {cta.label}
                          </Link>
                          <ul className="list-unstyled small mb-0">
                            {planBullets(plan).map((f) => (
                              <li key={f} className="d-flex align-items-start gap-2 mb-2">
                                <Icon color="#16a34a" size={16}><polyline points="20 6 9 17 4 12" /></Icon>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
              <div className="text-center mt-4">
                <Link to="/pricing" style={{ color: PURPLE, fontWeight: 500 }} className="text-decoration-none">
                  View all plans &amp; full feature comparison &rarr;
                </Link>
              </div>
            </>
          )}
        </Container>
      </Container>

      {/* Security */}
      <Container id="security" className="py-5">
        <SectionHeading
          eyebrow="Security First"
          title="A Safer, Fairer Examination Environment"
          subtitle="Built with security and integrity at its core."
        />
        <Row className="g-4">
          {securityItems.map((item) => (
            <Col key={item.title} xs={12} sm={6} lg={3} className="d-flex align-items-start gap-3">
              <IconBadge bg="#eef2ff" color={PURPLE} size={40}>{item.icon}</IconBadge>
              <div>
                <div className="fw-bold small">{item.title}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{item.subtitle}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>

      {/* FAQ */}
      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-4">
          <div>
            <Eyebrow>Frequently Asked Questions</Eyebrow>
            <h2 className="fw-bold mb-0">Got Questions? We&apos;ve Got Answers.</h2>
          </div>
          <Link to="/contact" className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
            View All FAQs &rarr;
          </Link>
        </div>
        <Row className="g-3">
          {faqs.map((faq) => (
            <Col xs={12} md={6} key={faq.question}>
              <Accordion>
                <Accordion.Item eventKey="0" className="border-0 shadow-sm rounded-3 overflow-hidden">
                  <Accordion.Header>{faq.question}</Accordion.Header>
                  <Accordion.Body className="text-muted small">{faq.answer}</Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Final CTA banner */}
      <Container fluid className="px-0">
        <div style={{ background: 'linear-gradient(90deg, #4f46e5, #4338ca)' }} className="py-5">
          <Container>
            <Row className="align-items-center g-4">
              <Col lg={8}>
                <span className="badge rounded-pill mb-2 px-3 py-1" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: 12 }}>
                  Ready to Get Started?
                </span>
                <h2 className="fw-bold text-white mb-2">Start Creating Better Exams Today</h2>
                <p className="mb-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Join institutions that trust ExamVault for modern, secure and efficient assessments.
                </p>
              </Col>
              <Col lg={4} className="d-flex flex-wrap gap-3 justify-content-lg-end">
                <Link to="/register" className="btn btn-light btn-lg fw-medium">
                  Get Started Free &rarr;
                </Link>
                <Link to="/contact" className="btn btn-outline-light btn-lg d-inline-flex align-items-center gap-2">
                  <CalendarIcon /> Book a Demo
                </Link>
              </Col>
            </Row>
          </Container>
        </div>
      </Container>

      <Footer />

      {mode && <AuthModal mode={mode} onClose={() => navigate('/')} />}
    </div>
  );
}
