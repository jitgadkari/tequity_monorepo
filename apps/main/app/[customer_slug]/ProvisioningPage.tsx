'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface ProvisioningPageProps {
  tenantId: string;
  workspaceName?: string;
}

const PROVISIONING_STEPS = [
  { id: 'database', label: 'Creating your database', duration: 180 },
  { id: 'storage', label: 'Setting up cloud storage', duration: 30 },
  { id: 'security', label: 'Configuring security', duration: 30 },
  { id: 'finalizing', label: 'Finalizing workspace', duration: 60 },
];

export function ProvisioningPage({ tenantId, workspaceName }: ProvisioningPageProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    // Note: Provisioning is already triggered by the checkout API
    // We only need to poll for status updates here

    // Poll for status every 2 seconds
    const statusInterval = setInterval(() => {
      router.refresh();
    }, 2000);

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(timeInterval);
    };
  }, [tenantId, router]);

  // Simulate step progression based on elapsed time
  useEffect(() => {
    let accumulatedTime = 0;
    for (let i = 0; i < PROVISIONING_STEPS.length; i++) {
      accumulatedTime += PROVISIONING_STEPS[i].duration;
      if (elapsedTime < accumulatedTime) {
        setCurrentStep(i);
        setIsOvertime(false);
        return;
      }
    }
    // All steps complete but still provisioning - we're in overtime
    setCurrentStep(PROVISIONING_STEPS.length - 1);
    setIsOvertime(true);
  }, [elapsedTime]);

  const estimatedTotal = PROVISIONING_STEPS.reduce((sum, step) => sum + step.duration, 0);
  const remainingTime = Math.max(0, estimatedTotal - elapsedTime);
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  // Calculate overtime display
  const overtimeSeconds = elapsedTime - estimatedTotal;
  const overtimeMinutes = Math.floor(overtimeSeconds / 60);
  const overtimeSecondsDisplay = overtimeSeconds % 60;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Setting up {workspaceName || 'your workspace'}
          </h1>
          <p className="text-slate-500 mt-2">
            This typically takes 4-6 minutes
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-8">
          {PROVISIONING_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3">
              {index < currentStep ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              ) : index === currentStep ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-6 h-6 text-slate-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                index <= currentStep ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Time Estimate */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          {isOvertime ? (
            <>
              <p className="text-sm text-amber-600">Taking longer than expected</p>
              <p className="text-2xl font-mono font-semibold text-amber-600">
                +{overtimeMinutes}:{overtimeSecondsDisplay.toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Please wait, this can take up to 15 minutes for complex setups
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">Estimated time remaining</p>
              <p className="text-2xl font-mono font-semibold text-slate-900">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </p>
            </>
          )}
        </div>

        {/* Footer Message */}
        <p className="text-center text-xs text-slate-400 mt-6">
          You&apos;ll be automatically redirected when ready.
          <br />Please don&apos;t close this tab.
        </p>
      </div>
    </div>
  );
}
