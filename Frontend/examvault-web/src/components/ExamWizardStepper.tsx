import { Button } from 'react-bootstrap';

export type WizardStep = 1 | 2 | 3 | 4;

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Basic Information' },
  { step: 2, label: 'Manage Sections' },
  { step: 3, label: 'Exam Configuration' },
  { step: 4, label: 'Review & Publish' },
];

interface ExamWizardStepperProps {
  currentStep: WizardStep;
  containsSections: boolean;
}

export default function ExamWizardStepper({ currentStep, containsSections }: ExamWizardStepperProps) {
  const steps = containsSections ? STEPS : STEPS.filter((s) => s.step !== 2);

  return (
    <div className="d-flex gap-2 mb-4 flex-wrap">
      {steps.map(({ step, label }) => (
        <Button
          key={step}
          variant={step === currentStep ? 'primary' : step < currentStep ? 'outline-primary' : 'outline-secondary'}
          size="sm"
          disabled
          className="text-nowrap"
        >
          {step}. {label}
        </Button>
      ))}
    </div>
  );
}
