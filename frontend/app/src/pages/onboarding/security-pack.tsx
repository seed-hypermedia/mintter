import { useCallback } from 'react';

import { Button } from '@mintter/ui/button';

import {
  OnboardingStep,
  OnboardingStepActions,
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
        <Button size="large" variant="outlined" onClick={prev}>
          Back
        </Button>
        <Button size="large" onClick={handleSubmit}>
          Next
        </Button>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};
