import { useCallback } from 'react';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
  SecurityPackIcon,
} from './common';

export const SecurityPack: React.FC<OnboardingStepPropsType> = ({
  prev,
  next,
}) => {
  const handleSubmit = useCallback(async () => {
    next();
  }, [next]);

  return (
    <OnboardingStep>
      <OnboardingStepTitle icon={<SecurityPackIcon />}>
        Security Pack
      </OnboardingStepTitle>
      <OnboardingStepDescription>
        Please save these 24 words securely! This will allow you to recreate
        your account:
      </OnboardingStepDescription>
      <OnboardingStepActions>
        <OnboardingStepButton variant="outlined" onClick={prev}>
          Back
        </OnboardingStepButton>
        <OnboardingStepButton onClick={handleSubmit}>Next</OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};
