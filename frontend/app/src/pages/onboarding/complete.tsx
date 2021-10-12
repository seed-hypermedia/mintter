import {useCallback} from 'react'
import {useQueryClient} from 'react-query'
import {useLocation, useRoute} from 'wouter'
import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepTitle,
} from './common'

export const Complete: React.FC = () => {
  const [, setLocation] = useLocation()
  const [, params] = useRoute<{from?: string}>('/welcome/:from')
  const queryClient = useQueryClient()

  const handleSubmit = useCallback(async () => {
    console.log('submit welcome!!')
    await queryClient.invalidateQueries('AccountInfo')
    setLocation(params?.from ?? '/', {replace: true})
  }, [history, location])

  return (
    <OnboardingStep>
      <OnboardingStepTitle css={{marginTop: 'auto'}}>Thank You</OnboardingStepTitle>
      <OnboardingStepDescription>
        You just created your Mintter account. Please share it with others and help us spread the word.
      </OnboardingStepDescription>
      <OnboardingStepActions>
        <OnboardingStepButton color="success" onClick={handleSubmit}>
          Open Mintter App
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  )
}
