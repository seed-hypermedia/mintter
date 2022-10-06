import {updateProfile} from '@app/client'
import {TextField} from '@components/text-field'
import {useMutation} from '@tanstack/react-query'
import {useCallback} from 'react'
import {useForm} from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  IconContainer,
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
} from './common'

type ProfileInformationDataType = {
  alias: string
  email: string
  bio: string
}

export function ProfileInformation({next}: OnboardingStepPropsType) {
  const mutate = useMutation(updateProfile)
  const {register, handleSubmit, formState} =
    useForm<ProfileInformationDataType>({
      mode: 'onChange',
      defaultValues: {
        alias: '',
        email: '',
        bio: '',
      },
    })

  const onSubmit = useCallback(
    async (data: ProfileInformationDataType) => {
      await toast.promise(mutate.mutateAsync(data), {
        loading: 'Updating profile',
        success: 'Profile updated',
        error: 'Error updating profile',
      })
      next()
    },
    [next, mutate],
  )

  return (
    <OnboardingStep onSubmit={handleSubmit(onSubmit)}>
      <OnboardingStepTitle icon={<ProfileInformationIcon />}>
        Profile Information
      </OnboardingStepTitle>
      <OnboardingStepDescription>
        Link your personal data with your new Mintter account. You can fill this
        information later if you prefer.
      </OnboardingStepDescription>
      <OnboardingStepBody
        css={{display: 'flex', flexDirection: 'column', gap: '$6'}}
      >
        <TextField
          type="text"
          label="Alias"
          id="alias"
          {...register('alias')}
          data-testid="alias-input"
          placeholder="Readable alias or username. Doesn't have to be unique."
        />
        <TextField
          type="email"
          status={formState.errors.email && 'danger'}
          label="Email"
          id="email"
          data-testid="email-input"
          {...register('email', {
            pattern: {
              // eslint-disable-next-line no-control-regex
              value: /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/,
              message: 'Please type a valid email.',
            },
          })}
          placeholder="Real email that could be publically shared"
          hint={formState.errors.email?.message}
        />
        <TextField
          textarea
          id="bio"
          label="Bio"
          data-testid="bio-input"
          {...register('bio')}
          rows={4}
          placeholder="A little bit about yourself..."
        />
      </OnboardingStepBody>
      <OnboardingStepActions>
        <OnboardingStepButton
          type="submit"
          data-testid="next-btn"
          disabled={!formState.isValid || formState.isSubmitting}
        >
          Next
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  )
}

export function ProfileInformationIcon() {
  return (
    <IconContainer>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M33.3334 34V30.6667C33.3334 28.8986 32.631 27.2029 31.3807 25.9526C30.1305 24.7024 28.4348 24 26.6667 24H13.3334C11.5652 24 9.86955 24.7024 8.61931 25.9526C7.36907 27.2029 6.66669 28.8986 6.66669 30.6667V34"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 17.3333C23.6819 17.3333 26.6666 14.3486 26.6666 10.6667C26.6666 6.98477 23.6819 4 20 4C16.3181 4 13.3333 6.98477 13.3333 10.6667C13.3333 14.3486 16.3181 17.3333 20 17.3333Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconContainer>
  )
}
