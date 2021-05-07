import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepTitle,
} from './common';
import { queryClient } from '../../app-providers';

export const Complete: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ from?: string }>();

  const handleSubmit = useCallback(async () => {
    console.log('submit welcome!!');
    await queryClient.invalidateQueries('Account');
    history.replace(location.state.from ?? '/library');
  }, [history, location]);

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
        <OnboardingStepButton color="success" onClick={handleSubmit}>
          Open Mintter App
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};
