
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const StepperContext = React.createContext<{
    activeStep: number
    totalSteps: number
} | null>(null)

function useStepper() {
    const context = React.useContext(StepperContext)
    if (!context) {
        throw new Error("useStepper must be used within a Stepper component")
    }
    return context
}

const Stepper = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        const childrenArray = React.Children.toArray(children)
        const totalSteps = childrenArray.length
        const activeStep = childrenArray.findIndex(child => {
            return React.isValidElement(child) && (child.props as StepProps).isActive
        }) + 1

        const contextValue = React.useMemo(() => ({ activeStep, totalSteps }), [activeStep, totalSteps]);

        return (
            <StepperContext.Provider value={contextValue}>
                <div
                    ref={ref}
                    className={cn("flex flex-col gap-4", className)}
                    {...props}
                >
                    {children}
                </div>
            </StepperContext.Provider>
        )
    }
)
Stepper.displayName = "Stepper"

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
    isCompleted: boolean;
    isActive: boolean;
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
    ({ className, children, isCompleted, isActive, ...props }, ref) => {
        const { activeStep, totalSteps } = useStepper()
        const stepIndex = React.useMemo(() => {
            let index = 0;
            const parent = (ref as any)?.current?.parentElement;
            if(parent) {
                const siblings = Array.from(parent.children);
                index = siblings.indexOf((ref as any).current) + 1;
            }
            return index;
        }, [ref]);

        const isLastStep = stepIndex === totalSteps

        return (
            <div
                ref={ref}
                className={cn("relative flex items-start gap-4", className)}
                {...props}
            >
                {!isLastStep && (
                    <div className={cn(
                        "absolute left-[14px] top-10 h-[calc(100%-1.25rem)] w-px bg-border transition-colors",
                         (isActive || isCompleted) && "bg-primary"
                    )} aria-hidden="true" />
                )}

                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background transition-colors",
                    isActive && "border-primary",
                    isCompleted && "border-primary bg-primary text-primary-foreground"
                )}>
                    {isCompleted ? <Check className="h-5 w-5" /> : (
                        <span className={cn(isActive && "text-primary")}>{stepIndex}</span>
                    )}
                </div>
                <div className={cn("flex-1 pt-1", isCompleted && "opacity-60")}>
                    {children}
                </div>
            </div>
        )
    }
)
Step.displayName = "Step"

export { Stepper, Step, useStepper }
