'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wand2,
  Loader2,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SCENE_TYPES, STYLE_OPTIONS, MOOD_OPTIONS, LIGHTING_OPTIONS } from '@/lib/constants';
import type { PromptTags } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AnalyzeStepProps {
  collectionName: string;
  selectedProductIds: string[];
  inspirationImages: string[];
  onComplete: (collectionId: string) => void;
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: string[];
  category: keyof PromptTags;
}

type AnalysisPhase = 'analyzing' | 'questions' | 'creating' | 'complete';

// Questions that might be asked based on missing/ambiguous information
const generateClarifyingQuestions = (
  hasInspiration: boolean,
  productCount: number
): ClarifyingQuestion[] => {
  const questions: ClarifyingQuestion[] = [];

  // If no inspiration images, ask about room type preference
  if (!hasInspiration) {
    questions.push({
      id: 'room-type',
      question: 'What type of room should your products be visualized in?',
      type: 'multiple',
      options: [...SCENE_TYPES],
      category: 'sceneType',
    });

    questions.push({
      id: 'style',
      question: 'What design style best represents your brand?',
      type: 'multiple',
      options: [...STYLE_OPTIONS].slice(0, 6),
      category: 'style',
    });
  }

  // Always ask about mood if no inspiration
  if (!hasInspiration) {
    questions.push({
      id: 'mood',
      question: 'What mood or atmosphere should the images convey?',
      type: 'multiple',
      options: [...MOOD_OPTIONS].slice(0, 6),
      category: 'mood',
    });
  }

  return questions;
};

export function AnalyzeStep({
  collectionName,
  selectedProductIds,
  inspirationImages,
  onComplete,
}: AnalyzeStepProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<AnalysisPhase>('analyzing');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [suggestedTags, setSuggestedTags] = useState<PromptTags>({
    sceneType: [],
    style: [],
    mood: [],
    lighting: [],
    custom: [],
  });
  const [isCreating, setIsCreating] = useState(false);

  // Prevent duplicate runs in React Strict Mode (development)
  // This is a critical guard to prevent duplicate API calls and database inserts
  const hasRunAnalysis = useRef(false);
  const creationAttempted = useRef(false);

  // Run analysis on mount
  useEffect(() => {
    // CRITICAL: Guard against duplicate runs (React 18 Strict Mode runs effects twice in dev)
    // Without this, we'd create duplicate collections in the database
    if (hasRunAnalysis.current) {
      console.log('⚠️ Analysis already ran, skipping duplicate run (React Strict Mode)');
      return;
    }
    hasRunAnalysis.current = true;

    const runAnalysis = async () => {
      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      try {
        // Call the analysis API
        const data = await apiClient.analyzeProducts({
          productIds: selectedProductIds,
          inspirationImageUrls: inspirationImages,
        });

        clearInterval(progressInterval);
        setAnalysisProgress(100);

        // Store suggested tags from analysis
        setSuggestedTags({
          sceneType: data.suggestedTags.sceneType || [],
          style: data.suggestedTags.style || [],
          mood: data.suggestedTags.mood || [],
          lighting: data.suggestedTags.lighting || ['Natural'],
          custom: [],
        });

        // Generate clarifying questions if needed
        const clarifyingQuestions = generateClarifyingQuestions(
          inspirationImages.length > 0,
          selectedProductIds.length
        );

        // Small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (clarifyingQuestions.length > 0) {
          setQuestions(clarifyingQuestions);
          setPhase('questions');
        } else {
          // No questions needed, proceed to create collection
          await createCollection();
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        clearInterval(progressInterval);
        setAnalysisProgress(100);

        // Still generate questions on error
        const clarifyingQuestions = generateClarifyingQuestions(
          inspirationImages.length > 0,
          selectedProductIds.length
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (clarifyingQuestions.length > 0) {
          setQuestions(clarifyingQuestions);
          setPhase('questions');
        } else {
          await createCollection();
        }
      }
    };

    runAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswerSelect = (questionId: string, option: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (question.type === 'single') {
        return { ...prev, [questionId]: [option] };
      } else {
        // Multiple selection - toggle
        if (current.includes(option)) {
          return { ...prev, [questionId]: current.filter((o) => o !== option) };
        } else {
          return { ...prev, [questionId]: [...current, option] };
        }
      }
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions answered, create collection
      createCollection();
    }
  };

  const createCollection = async () => {
    // CRITICAL: Prevent duplicate calls (both from React Strict Mode and user actions)
    // This prevents duplicate database inserts
    if (isCreating || creationAttempted.current) {
      console.log(
        '⚠️ Collection creation already in progress or completed, skipping duplicate call'
      );
      return;
    }

    creationAttempted.current = true;
    setPhase('creating');
    setIsCreating(true);

    try {
      // Merge suggested tags with user answers
      const finalTags: PromptTags = { ...suggestedTags };

      // Apply answers to tags
      for (const question of questions) {
        const questionAnswers = answers[question.id] || [];
        if (questionAnswers.length > 0) {
          finalTags[question.category] = [
            ...new Set([...finalTags[question.category], ...questionAnswers]),
          ];
        }
      }

      // Ensure we have at least some defaults
      if (finalTags.sceneType.length === 0) {
        finalTags.sceneType = ['Living Room'];
      }
      if (finalTags.style.length === 0) {
        finalTags.style = ['Modern'];
      }
      if (finalTags.lighting.length === 0) {
        finalTags.lighting = ['Natural'];
      }

      // Create the collection via API
      // Convert inspiration images array to Record<string, string>
      const inspirationImagesRecord = inspirationImages.reduce<Record<string, string>>(
        (acc, url, idx) => {
          acc[`image-${idx}`] = url;
          return acc;
        },
        {}
      );

      const collection = await apiClient.createCollection({
        name: collectionName,
        productIds: selectedProductIds,
        inspirationImages: inspirationImagesRecord,
        promptTags: finalTags,
      });

      setPhase('complete');

      // Brief pause to show completion, then navigate
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.success('Collection created successfully!');
      onComplete(collection.id);
      router.push(`/studio/collections/${collection.id}`);
    } catch (error: any) {
      console.error('Failed to create collection:', error);
      toast.error(error.message || 'Failed to create collection');
      // Reset guards on error so user can retry
      creationAttempted.current = false;
      setIsCreating(false);
      setPhase('questions'); // Go back to questions
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswers = currentQuestion ? answers[currentQuestion.id] || [] : [];
  const canProceed = currentAnswers.length > 0;

  // Analyzing Phase
  if (phase === 'analyzing') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="py-20 text-center">
          <div className="mb-6 inline-flex h-24 w-24 animate-pulse-glow items-center justify-center rounded-full bg-primary/20">
            <Wand2 className="h-12 w-12 animate-pulse text-primary" />
          </div>
          <h2 className="text-gradient-gold mb-3 text-2xl font-bold">Analyzing Your Selection</h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            AI is analyzing your {selectedProductIds.length} products
            {inspirationImages.length > 0 &&
              ` and ${inspirationImages.length} inspiration images`}{' '}
            to prepare the best generation settings...
          </p>

          {/* Progress Bar */}
          <div className="mx-auto mb-6 max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {analysisProgress < 100 ? 'Analyzing...' : 'Analysis complete'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>This usually takes a few seconds</span>
          </div>
        </div>
      </div>
    );
  }

  // Questions Phase
  if (phase === 'questions' && currentQuestion) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-gradient-gold mb-2 text-2xl font-bold">
            Help Us Understand Your Vision
          </h2>
          <p className="text-muted-foreground">
            Answer a few quick questions to help us generate the perfect images.
          </p>
        </div>

        {/* Progress Dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                index === currentQuestionIndex
                  ? 'w-8 bg-primary'
                  : index < currentQuestionIndex
                    ? 'bg-primary'
                    : 'bg-secondary'
              )}
            />
          ))}
        </div>

        {/* Question Card */}
        <Card className="mb-8 p-8">
          <div className="mb-6">
            <p className="mb-1 text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>
            {currentQuestion.type === 'multiple' && (
              <p className="mt-1 text-sm text-muted-foreground">Select all that apply</p>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {currentQuestion.options.map((option) => {
              const isSelected = currentAnswers.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                  className={cn(
                    'rounded-lg border-2 p-4 text-center font-medium transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-primary/50'
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-end">
          <Button variant="glow" size="lg" onClick={handleNextQuestion} disabled={!canProceed}>
            {currentQuestionIndex < questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Create Collection
                <Sparkles className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Creating Phase
  if (phase === 'creating') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="py-20 text-center">
          <div className="mb-6 inline-flex h-24 w-24 animate-pulse-glow items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-12 w-12 animate-pulse text-primary" />
          </div>
          <h2 className="text-gradient-gold mb-3 text-2xl font-bold">Creating Your Collection</h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            Setting up "{collectionName}" with {selectedProductIds.length} products...
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Almost there...</span>
          </div>
        </div>
      </div>
    );
  }

  // Complete Phase
  if (phase === 'complete') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="py-20 text-center">
          <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-gradient-gold mb-3 text-2xl font-bold">Collection Created!</h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            Redirecting you to the collection studio...
          </p>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
