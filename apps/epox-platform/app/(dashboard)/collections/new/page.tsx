'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/constants';

// Import wizard steps
import { ProductSelectionStep } from '@/components/wizard/ProductSelectionStep';
import { InspirationStep } from '@/components/wizard/InspirationStep';
import { AnalyzeStep } from '@/components/wizard/AnalyzeStep';

export default function NewCollectionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [collectionName, setCollectionName] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Select Products + Name
        return selectedProductIds.length > 0 && collectionName.trim().length > 0;
      case 2: // Inspire - optional, can always proceed
        return true;
      case 3: // Analyze - handled by the component itself
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCollectionCreated = (collectionId: string) => {
    // Navigation is handled by AnalyzeStep
    console.log('Collection created:', collectionId);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Select Products + Name
        return (
          <ProductSelectionStep
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            collectionName={collectionName}
            onNameChange={setCollectionName}
          />
        );
      case 2: // Inspire - Add inspiration images
        return (
          <InspirationStep
            selectedImages={inspirationImages}
            onImagesChange={setInspirationImages}
          />
        );
      case 3: // Analyze - AI analysis phase
        return (
          <AnalyzeStep
            collectionName={collectionName}
            selectedProductIds={selectedProductIds}
            inspirationImages={inspirationImages}
            onComplete={handleCollectionCreated}
          />
        );
      default:
        return null;
    }
  };

  // Don't show navigation footer on the analyze step (it handles its own flow)
  const showFooter = currentStep < 3;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-8 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/collections">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Create Collection</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {WIZARD_STEPS.length}:{' '}
              {WIZARD_STEPS[currentStep - 1].description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentStep < 3 && (
            <Button variant="outline" size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          )}
          <Link href="/collections">
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card/30 px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id >= currentStep}
                  className={cn(
                    'flex items-center gap-2 transition-colors',
                    step.id === currentStep
                      ? 'text-primary'
                      : step.id < currentStep
                        ? 'cursor-pointer text-foreground hover:text-primary'
                        : 'cursor-not-allowed text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all',
                      step.id === currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : step.id < currentStep
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-card text-muted-foreground'
                    )}
                  >
                    {step.id < currentStep ? '✓' : step.id}
                  </span>
                  <span className="hidden font-medium sm:inline">{step.label}</span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-16 transition-colors sm:w-32',
                      step.id < currentStep ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-8">{renderStep()}</div>

      {/* Footer Navigation - only show for steps 1 and 2 */}
      {showFooter && (
        <footer className="fixed bottom-0 left-64 right-0 z-30 flex items-center justify-between border-t border-border bg-card/80 px-8 py-4 backdrop-blur-xl">
          <div>
            {selectedProductIds.length > 0 && currentStep === 1 && (
              <span className="text-sm text-muted-foreground">
                {selectedProductIds.length} products selected
              </span>
            )}
            {currentStep === 2 && (
              <span className="text-sm text-muted-foreground">
                {inspirationImages.length > 0
                  ? `${inspirationImages.length} inspiration images`
                  : 'No inspiration images (optional)'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button variant="glow" onClick={handleNext} disabled={!canProceed()}>
              {currentStep === 2 ? (
                <>
                  Start Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
