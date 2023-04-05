import {Profile} from '@mintter/shared'
import {TextField} from '@components/text-field'
import {useMutation} from '@tanstack/react-query'
import {FormEvent} from 'react'
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
import {accountsClient} from '@app/api-clients'

type ProfileInformationDataType = {
  alias: string
  bio: string
}

export function ProfileInformation({
  next,
  updateProfile = accountsClient.updateProfile,
}: OnboardingStepPropsType) {
  const {mutate} = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success('Profile Updated')
      next()
    },
    onError: () => {
      toast.error('Error updating profile')
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    let formData = new FormData(e.currentTarget)
    // @ts-ignore
    let newProfile: ProfileInformationDataType = Object.fromEntries(
      formData.entries(),
    )
    e.preventDefault()
    mutate(newProfile as Profile)
  }

  return (
    <OnboardingStep onSubmit={onSubmit}>
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
          name="alias"
          data-testid="alias-input"
          placeholder="Readable alias or username. Doesn't have to be unique."
        />
        <TextField
          textarea
          id="bio"
          name="bio"
          label="Bio"
          data-testid="bio-input"
          rows={4}
          placeholder="A little bit about yourself..."
        />
      </OnboardingStepBody>
      <OnboardingStepActions>
        <OnboardingStepButton type="submit" data-testid="next-btn">
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
