import {updateProfile} from '@app/client'
import {TextField} from '@components/text-field'
import {useMutation} from '@tanstack/react-query'
import {useCallback} from 'react'
import {useForm} from 'react-hook-form'
import toast from 'react-hot-toast'
import type {OnboardingStepPropsType} from './common'
import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepTitle,
  ProfileInformationIcon,
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
