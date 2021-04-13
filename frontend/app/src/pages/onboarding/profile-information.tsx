import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import * as client from '@mintter/client';
import { TextField } from '@mintter/ui/text-field';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
  ProfileInformationIcon,
} from './common';

type ProfileInformationDataType = {
  username: string;
  email: string;
  bio: string;
};

export const ProfileInformation: React.FC<OnboardingStepPropsType> = ({
  prev,
  next,
}) => {
  const updateProfile = useMutation(client.updateProfile);

  const {
    register,
    handleSubmit,
    errors,
    formState,
  } = useForm<ProfileInformationDataType>({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      bio: '',
    },
  });

  const onSubmit = useCallback(
    async (data: ProfileInformationDataType) => {
      await updateProfile.mutateAsync(data);
      next();
    },
    [next, updateProfile],
  );

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
        css={{ display: 'flex', flexDirection: 'column', gap: '$6' }}
      >
        <TextField
          type="text"
          label="Username"
          id="username"
          name="username"
          ref={register}
          placeholder="Readable username or alias. Doesn't have to be unique."
        />
        <TextField
          type="email"
          status={errors.email && 'danger'}
          label="Email"
          id="email"
          name="email"
          ref={register({
            pattern: {
              value: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
              message: 'Please type a valid email.',
            },
          })}
          placeholder="Real email that could be publically shared"
          hint={errors.email?.message}
        />
        <TextField
          // TODO: Fix types
          // @ts-ignore
          as="textarea"
          id="bio"
          name="bio"
          label="Bio"
          ref={register}
          rows={4}
          placeholder="A little bit about yourself..."
        />
      </OnboardingStepBody>
      <OnboardingStepActions>
        <OnboardingStepButton variant="outlined" onClick={prev}>
          Back
        </OnboardingStepButton>
        <OnboardingStepButton
          type="submit"
          disabled={!formState.isValid || formState.isSubmitting}
        >
          Next
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};
