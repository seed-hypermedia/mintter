import * as React from 'react';
import { useForm } from 'react-hook-form';
// import Seo from 'components/seo'
import { Input } from '@mintter/ui/input';
import { Textarea } from '@mintter/ui/textarea';
import { ProfileAddress } from './profile-address';
// import {ErrorMessage, ErrorInterface} from 'components/error-message'
import { useProfile } from './mintter-hooks';
import * as apiClient from './mintter-client';

import { useToasts } from 'react-toast-notifications';
import { useMutation } from 'react-query';
import { MainColumn } from './main-column';
import { Button } from '@mintter/ui/button';
import { Box } from '@mintter/ui/box';
import { Heading } from '@mintter/ui/heading';

export default function Settings() {
  const { data: profile } = useProfile();
  // const { addToast, updateToast } = useToasts();
  const [submitError, setSubmitError] = React.useState();
  const { register, handleSubmit, errors, formState, setValue } = useForm({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      bio: '',
      accountId: '',
    },
  });

  React.useEffect(() => {
    if (profile) {
      setValue('username', profile.username);
      setValue('email', profile.email);
      setValue('bio', profile.bio);
    }
  }, [profile]);

  // TODO: fix types
  async function onSubmit(data: any) {
    // const toast = addToast('Updating profile...', {
    //   appearance: 'info',
    //   autoDismiss: false,
    // });
    try {
      // TODO: fix types
      await apiClient.updateProfile(data as any);
      // updateToast(toast, {
      //   autoDismiss: true,
      //   content: 'Update Successfull!',
      //   appearance: 'success',
      // });
    } catch (err) {
      // updateToast(toast, {
      //   autoDismiss: true,
      //   content: err.message,
      //   appearance: 'error',
      // });
      setSubmitError(err);
    }
  }

  return (
    <>
      {/* <Seo title="Settings" /> */}
      <div>
        <div className={`grid gap-4 grid-flow-col`}>
          <div />
          <MainColumn>
            <form
              className="rounded pb-12 mb-4 w-full"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Heading>Settings</Heading>
              <div className="flex-col flex flex-1">
                <div className="flex-1 relative">
                  <label
                    className="block text-body-muted text-xs font-semibold mb-1"
                    htmlFor="username"
                  >
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    ref={register}
                    type="text"
                    placeholder="Readable username or alias. Doesn't have to be unique."
                  />
                </div>
                <div className="flex-1 relative mt-10">
                  <label
                    className="block text-body-muted text-xs font-semibold mb-1"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    ref={register({
                      pattern: {
                        // eslint-disable-next-line no-control-regex
                        value: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
                        message: 'Please type a valid email.',
                      },
                    })}
                    error={!!errors.email}
                    type="email"
                    placeholder="Real email that could be publically shared"
                  />

                  {errors.email && (
                    <p
                      role="alert"
                      className="text-danger text-xs absolute left-0 mt-1"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="flex-1 relative mt-10">
                  <label
                    className="block text-body-muted text-xs font-semibold mb-1"
                    htmlFor="bio"
                  >
                    Bio
                  </label>
                  <Textarea
                    id="bio"
                    name="bio"
                    ref={register}
                    rows={4}
                    placeholder="A little bit about yourself..."
                  />
                </div>
                <Box css={{ marginTop: '$5' }}>
                  <Button
                    type="submit"
                    disabled={!formState.isValid}
                    size="2"
                    variant="success"
                    appearance="outline"
                  >
                    Save
                  </Button>
                </Box>
                <hr className="border-t-2 border-muted border-solid mt-10" />
                <p className="block text-white text-xs font-semibold bg-info rounded px-4 py-2 mt-8">
                  All your Mintter content is located in{' '}
                  <code className="mx-1">~/.mtt/</code>
                </p>
                <div className="flex-1 relative mt-10">
                  <label
                    className="block text-body-muted text-xs font-semibold mb-1"
                    htmlFor="accountId"
                  >
                    Account Id
                  </label>
                  <Input
                    ref={register}
                    id="accountId"
                    name="accountId"
                    disabled
                    type="text"
                  />
                </div>
                <ProfileAddress />
              </div>
              {/* <ErrorMessage error={submitError} /> */}
              {/* <p>SUBMIT ERROR</p> */}
            </form>
          </MainColumn>

          <div />
        </div>

        {/*
        // TODO: add this when avatar
         <style jsx>{`
          .avatar-container {
            width: 200px;
            height: 200px;
          }
        `}</style> */}
      </div>
    </>
  );
}
