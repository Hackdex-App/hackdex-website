"use client";

import React from "react";
import {
  DEFAULT_HACK_ONBOARDING_STATE,
  getLeftoverHackOnboardingSteps,
  readHackOnboardingState,
  writeHackOnboardingState,
  type HackOnboardingState,
  type HackOnboardingStep,
  type HackOnboardingStepState,
} from "@/utils/hack-onboarding";

interface UseHackOnboardingOptions {
  hasVersionPicker: boolean;
  romReady: boolean;
  romReadyKnown?: boolean;
  versionPickerOpen: boolean;
}

export function useHackOnboarding({
  hasVersionPicker,
  romReady,
  romReadyKnown = true,
  versionPickerOpen,
}: UseHackOnboardingOptions) {
  const [steps, setSteps] = React.useState<HackOnboardingState>(DEFAULT_HACK_ONBOARDING_STATE);
  const [hydrated, setHydrated] = React.useState(false);
  const [tourSteps, setTourSteps] = React.useState<HackOnboardingStep[]>([]);
  const [locked, setLocked] = React.useState(false);
  const previousRomReady = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    setSteps(readHackOnboardingState());
    setHydrated(true);
  }, []);

  const updateStep = React.useCallback((step: HackOnboardingStep, value: HackOnboardingStepState) => {
    setSteps((current) => {
      const next = { ...current, [step]: value };
      writeHackOnboardingState(next);
      return next;
    });
  }, []);

  const leftoverSteps = React.useMemo(
    () => getLeftoverHackOnboardingSteps(steps, { hasVersionPicker, romReady }),
    [steps, hasVersionPicker, romReady],
  );
  const currentStep = tourSteps[0] ?? null;
  const cardOpen = currentStep !== null;

  const closeCard = React.useCallback(() => {
    setTourSteps([]);
    setLocked(false);
  }, []);

  const finishCurrentStep = React.useCallback((value: HackOnboardingStepState) => {
    if (!currentStep) return;
    updateStep(currentStep, value);
    setTourSteps((current) => current.slice(1));
    if (tourSteps.length === 1) setLocked(false);
  }, [currentStep, tourSteps.length, updateStep]);

  const openFromGate = React.useCallback(() => {
    if (!romReadyKnown || leftoverSteps.length === 0) return;
    setTourSteps(leftoverSteps);
    setLocked(true);
  }, [romReadyKnown, leftoverSteps]);

  const next = React.useCallback(() => {
    finishCurrentStep("dismissed");
  }, [finishCurrentStep]);

  const gotIt = React.useCallback(() => {
    finishCurrentStep("dismissed");
  }, [finishCurrentStep]);

  const dismissCard = React.useCallback(() => {
    closeCard();
  }, [closeCard]);

  const onVersionConfirmed = React.useCallback(() => {
    if (!hasVersionPicker) return;
    updateStep("version", "passed");
    if (currentStep === "version") {
      setTourSteps((current) => current.slice(1));
      if (tourSteps.length === 1) setLocked(false);
    }
  }, [hasVersionPicker, currentStep, tourSteps.length, updateStep]);

  const onHackPageRomSupplied = React.useCallback(() => {
    updateStep("selectRom", "passed");
  }, [updateStep]);

  const onPatchSucceeded = React.useCallback(() => {
    updateStep("agree", "passed");
    closeCard();
  }, [updateStep, closeCard]);

  React.useEffect(() => {
    if (!romReadyKnown) return;
    if (previousRomReady.current === null) {
      previousRomReady.current = romReady;
      return;
    }

    const becameReady = !previousRomReady.current && romReady;
    previousRomReady.current = romReady;
    if (!hydrated || !becameReady) return;

    // Selecting a ROM always continues to Agree, even if leftover no longer
    // lists it (Agree may already be passed or dismissed).
    if (locked && tourSteps.length > 0) {
      setTourSteps((current) => {
        const withoutSelectRom = current.filter((step) => step !== "selectRom");
        return withoutSelectRom.includes("agree") ? withoutSelectRom : [...withoutSelectRom, "agree"];
      });
      return;
    }

    if (tourSteps.length === 0) {
      setTourSteps(["agree"]);
      setLocked(false);
    }
  }, [hydrated, locked, romReady, romReadyKnown, tourSteps.length]);

  const gateLabel = leftoverSteps.length === 1 && leftoverSteps[0] === "version"
    ? "How do I select a version?"
    : "How do I download?";

  return {
    showGate: hydrated && romReadyKnown && !cardOpen && leftoverSteps.length > 0,
    gateLabel,
    cardOpen,
    locked,
    currentStep,
    isLastStep: tourSteps.length === 1,
    hideForPicker: cardOpen && versionPickerOpen,
    openFromGate,
    next,
    gotIt,
    dismissCard,
    onVersionConfirmed,
    onHackPageRomSupplied,
    onPatchSucceeded,
  };
}
