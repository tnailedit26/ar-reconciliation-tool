/**
 * StepIndicator — Wizard progress bar
 * Design: Refined Enterprise — Sora font, deep teal primary, clean step connectors
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isUpcoming = currentStep < step.id;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground shadow-sm",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md",
                  isUpcoming && "bg-muted text-muted-foreground border border-border"
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="text-center hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-semibold leading-tight",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3 mb-5 hidden sm:block">
                <div
                  className={cn(
                    "h-0.5 rounded-full transition-all duration-500",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
