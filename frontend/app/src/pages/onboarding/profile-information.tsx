import { useCallback } from 'react';

import { Button } from '@mintter/ui/button';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
  ProfileInformationIcon,
} from './common';

export const ProfileInformation: React.FC<OnboardingStepPropsType> = ({
  prev,
  next,
}) => {
  const handleSubmit = useCallback(() => {
    next();
  }, [next]);

  return (
    <OnboardingStep>
      <OnboardingStepTitle icon={<ProfileInformationIcon />}>
        Profile Information
      </OnboardingStepTitle>
      <OnboardingStepDescription>
        Link your personal data with your new Mintter account:
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
