import {useCallback} from 'react'
import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepTitle,
} from './common'

export const Complete: React.FC = () => {
  const handleSubmit = useCallback(
    function reloadOnComplete() {
      window.location.reload()
    },
    [history, location],
  )

  return (
    <OnboardingStep>
      <OnboardingStepTitle css={{marginTop: 'auto'}}>Thank You</OnboardingStepTitle>
      <OnboardingStepDescription>
        You just created your Mintter account. Please share it with others and help us spread the word.
      </OnboardingStepDescription>
      <OnboardingStepActions>
        <OnboardingStepButton color="success" onClick={handleSubmit} data-cy="next-btn">
          Open Mintter App
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  )
}
