import { useCallback } from 'react';
import { useLocation } from 'react-router';

import { Button } from '@mintter/ui/button';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepDescription,
  OnboardingStepTitle,
} from './common';

export const Complete: React.FC = () => {
  const location = useLocation<{ from?: string }>();

  const handleSubmit = useCallback(() => {
    alert(`Redirect to ${location.state.from}`);
  }, []);

  return (
    <OnboardingStep>
      <OnboardingStepTitle css={{ marginTop: 'auto' }}>
        Thank You
      </OnboardingStepTitle>
      <OnboardingStepDescription>
        You just created your Mintter account. Please share it with others and
        help us spread the word.
      </OnboardingStepDescription>
      <OnboardingStepActions>
        <Button color="success" size="large" onClick={handleSubmit}>
          Open Mintter App
        </Button>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};
