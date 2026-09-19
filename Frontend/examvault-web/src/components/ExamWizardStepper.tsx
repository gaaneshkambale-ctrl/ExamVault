export type WizardStep = 1 | 2 | 3 | 4;

const STEPS: { step: WizardStep; label: string; sublabel: string }[] = [
  { step: 1, label: 'Basic Information', sublabel: 'Exam details' },
  { step: 2, label: 'Sections & Questions', sublabel: 'Add sections & questions' },
  { step: 3, label: 'Exam Configuration', sublabel: 'Set preferences' },
  { step: 4, label: 'Review & Publish', sublabel: 'Finalize exam' },
];

interface ExamWizardStepperProps {
  currentStep: WizardStep;
  containsSections: boolean;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ExamWizardStepper({ currentStep, containsSections }: ExamWizardStepperProps) {
  // Non-sectioned exams still need a step 2 (see CreateExam.tsx's own
  // comment - questions attach to one hidden default section behind the
  // scenes) - relabeled rather than hidden, so progress still reads
  // correctly instead of jumping from step 1 straight to step 3.
  const steps = containsSections
    ? STEPS
    : STEPS.map((s) => (s.step === 2 ? { ...s, label: 'Questions', sublabel: 'Add questions' } : s));

  return (
    <div className="d-flex align-items-start mb-4">
      {steps.map(({ step, label, sublabel }, i) => {
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className="d-flex align-items-center" style={{ flex: i === steps.length - 1 ? '0 0 auto' : '1 1 auto' }}>
            <div className="d-flex flex-column align-items-center text-center" style={{ minWidth: 120 }}>
              <div
                className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  background: isDone ? '#198754' : isActive ? '#4f46e5' : '#e9ecef',
                  color: isDone || isActive ? 'white' : '#6c757d',
                  border: isActive ? '3px solid #c7d2fe' : 'none',
                }}
              >
                {isDone ? <CheckIcon /> : step}
              </div>
              <div
                className="small mt-2 text-nowrap"
                style={{ color: isActive ? '#4f46e5' : isDone ? '#198754' : '#6c757d', fontWeight: isActive ? 600 : 400 }}
              >
                {label}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{sublabel}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-grow-1" style={{ height: 2, background: isDone ? '#198754' : '#e9ecef', marginBottom: 30 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
