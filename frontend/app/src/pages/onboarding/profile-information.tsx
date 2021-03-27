import { useCallback } from 'react';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepButton,
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
        <OnboardingStepButton variant="outlined" onClick={prev}>
          Back
        </OnboardingStepButton>
        <OnboardingStepButton onClick={handleSubmit}>Next</OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};
