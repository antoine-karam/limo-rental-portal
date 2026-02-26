import { Check } from "lucide-react";

import styles from "./Stepper.module.css";

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const progressWidth = `${(currentStep / (steps.length - 1)) * 100}%`;
  return (
    <div className={styles.stepper}>
      <div className={styles.stepperTrack}>
        <div className={styles.stepperLineBg}>
          <div className={styles.stepperLineFill} style={{ width: progressWidth }} />
        </div>

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className={styles.stepperStep}>
              <div
                className={`${styles.stepperCircle}${isCompleted ? " " + styles.completed : isCurrent ? " " + styles.current : ""}`}
              >
                {isCompleted ? (
                  <Check width={20} height={20} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              <div className={styles.stepperLabel}>
                <p
                  className={`${styles.stepperLabelText}${isCurrent || isCompleted ? " " + styles.active : ""}`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className={styles.stepperDescription}>{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
