export interface OnboardingActionState {
  error: string | null;
  organizationNameError: string | null;
}

export const initialOnboardingActionState: OnboardingActionState = {
  error: null,
  organizationNameError: null,
};
