import * as React from 'react';
import { useForm } from 'react-hook-form';
// import Seo from 'components/seo'
import { Input } from '@components/input';
import { Textarea } from '@components/textarea';
import { ProfileAddress } from '../profile-address';
import { useProfile } from '../mintter-hooks';
import * as apiClient from '../mintter-client';
import { useToasts } from 'react-toast-notifications';
import { useMutation } from 'react-query';
import { Button } from '@mintter/ui/button';
import { Box } from '@mintter/ui/box';
import { Container } from '@components/container';
import { Label } from '@radix-ui/react-label';
import { Text } from '@mintter/ui/text';
import { Separator } from '@components/separator';

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
      setValue('accountId', profile.accountId);
    }
  }, [profile]);

  // TODO: fix types
  // TODO: add toasts
  async function onSubmit(data: any) {
    console.log('Updating profile...');
    // const toast = addToast('Updating profile...', {
    //   appearance: 'info',
    //   autoDismiss: false,
    // });
    try {
      // TODO: fix types
      await apiClient.updateProfile(data as any);
      console.log('Update Successfull!');
      // updateToast(toast, {
      //   autoDismiss: true,
      //   content: 'Update Successfull!',
      //   appearance: 'success',
      // });
    } catch (err) {
      console.log('Error: ', err.message);
      // updateToast(toast, {
      //   autoDismiss: true,
      //   content: err.message,
      //   appearance: 'error',
      // });
      setSubmitError(err);
    }
  }

  return (
    <Box
      data-testid="page"
      css={{
        display: 'grid',
        minHeight: '$full',
        gridTemplateAreas: `"controls controls controls"
        "maincontent maincontent maincontent"`,
        gridTemplateColumns: 'minmax(300px, 25%) 1fr minmax(300px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
      }}
    >
      <Container css={{ gridArea: 'maincontent', marginBottom: 300 }}>
        <Box
          as="form"
          css={{ width: '$full' }}
          onSubmit={handleSubmit(onSubmit)}
        >
          <Text as="h1" size="9">
            Settings
          </Text>
          <Box
            css={{
              display: 'grid',
              gridAutoFlow: 'row',
              gap: '$5',
              marginTop: '$7',
            }}
          >
            <Box>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                ref={register}
                type="text"
                placeholder="Readable username or alias. Doesn't have to be unique."
              />
            </Box>
            <Box>
              <Label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="email"
              >
                Email
              </Label>
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
                <Text role="alert" color="danger">
                  {errors.email.message}
                </Text>
              )}
            </Box>
            <Box>
              <Label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="bio"
              >
                Bio
              </Label>
              <Textarea
                id="bio"
                name="bio"
                ref={register}
                rows={4}
                placeholder="A little bit about yourself..."
              />
            </Box>
            <Box>
              <Button
                type="submit"
                disabled={!formState.isValid}
                size="2"
                variant="solid"
                appearance="pill"
                color="success"
              >
                Save
              </Button>
            </Box>
            <Separator />
            <Text
              size="2"
              color="primary"
              css={{
                paddingHorizontal: '$4',
                paddingVertical: '$3',
                borderRadius: '$2',
                display: 'block',
                background: '$primary-muted',
                border: '1px solid $colors$primary-softer',
              }}
            >
              All your Mintter content is located in <code>~/.mtt/</code>
            </Text>
            <Box>
              <Label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="accountId"
              >
                Account Id
              </Label>
              <Input
                ref={register}
                id="accountId"
                name="accountId"
                disabled
                type="text"
              />
            </Box>
            <ProfileAddress />
          </Box>
          {/* <ErrorMessage error={submitError} /> */}
          {/* <p>SUBMIT ERROR</p> */}
        </Box>
      </Container>
    </Box>
  );
}
