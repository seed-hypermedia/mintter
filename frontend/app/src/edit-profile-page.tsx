import * as React from 'react';
import { Container } from '@components/container';
import { Heading } from '@mintter/ui-legacy/heading';
import { Box } from '@mintter/ui-legacy/box';
import { NextButton, BackButton } from '@mintter/ui-legacy/button';
import { Input } from '@components/input';
import { Textarea } from '@components/textarea';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import * as apiClient from './mintter-client';
import { Grid } from '@mintter/ui-legacy/grid';
import { welcomeGrid } from './intro-page';
import { Text } from '@mintter/ui-legacy/text';
import { Label } from '@radix-ui/react-label';
import { useHistory, useRouteMatch } from 'react-router';
import { getPath } from '@utils/routes';

type DataProps = {
  username?: string;
  email?: string;
  bio?: string;
};

export default function EditProfile() {
  const { register, handleSubmit, errors, formState } = useForm({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      bio: '',
      accountId: '',
    },
  });

  const history = useHistory();
  const match = useRouteMatch();

  const { mutateAsync: updateProfile } = useMutation(apiClient.updateProfile);

  // TODO: fix types
  async function onSubmit(data: DataProps) {
    console.log(
      '🚀 ~ file: edit-profile.tsx ~ line 36 ~ onSubmit ~ data',
      data,
    );

    try {
      await updateProfile(data);
      history.replace(`${getPath(match)}/welcome/complete`);
    } catch (err) {
      console.error('Error ==> ', err);
    }
  }

  return (
    <form>
      <Grid className={welcomeGrid}>
        <Container
          css={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '$4',
          }}
        >
          <Heading>Edit your profile</Heading>
          <Text>Link your personal data with your new account</Text>
          <Box
            css={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '$6',
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
            <Box css={{ position: 'relative' }}>
              <Label htmlFor="email">Email</Label>
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
                variant={errors.email ? 'danger' : ''}
                type="email"
                placeholder="Real email that could be publically shared"
              />

              {errors.email && (
                <Text
                  role="alert"
                  data-testid="email-error"
                  color="danger"
                  size="2"
                  css={{
                    display: 'block',
                    position: 'absolute',
                    py: '$1',
                  }}
                >
                  {errors.email.message}
                </Text>
              )}
            </Box>
            <Box>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                ref={register}
                rows={4}
                placeholder="A little bit about yourself..."
              />
            </Box>
          </Box>
        </Container>
        <Container
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <NextButton
            onClick={handleSubmit(onSubmit)}
            disabled={!formState.isValid || formState.isSubmitting}
            data-testid="next-btn"
          >
            Next →
          </NextButton>
          <BackButton to={`${getPath(match)}/welcome`}>← start over</BackButton>
        </Container>
      </Grid>
    </form>
  );
}
