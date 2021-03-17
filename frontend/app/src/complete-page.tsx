import * as React from 'react';
import { Heading } from '@mintter/ui-legacy/heading';
import { Container } from '@mintter/ui-legacy/container';
import { Button } from '@mintter/ui-legacy/button';
import { Text } from '@mintter/ui-legacy/text';
import { useWelcome } from './welcome-provider';
import { getPath } from './routes';
import { Grid } from '@mintter/ui-legacy/grid';
import { welcomeGrid } from './intro-page';
import { useHistory, useRouteMatch } from 'react-router';

export default function WelcomeIndex() {
  const history = useHistory();
  const match = useRouteMatch();
  const { dispatch } = useWelcome();

  function handleNext() {
    dispatch({ type: 'reset' });
    history.push(`${getPath(match)}/library/feed`);
  }

  return (
    <Grid className={welcomeGrid}>
      <Container
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '$6',
        }}
      >
        <Heading>Complete!</Heading>
        <Text>
          you just create your Mintter account!. Please share it with others and
          the world!!
        </Text>
      </Container>
      <Container css={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          onClick={handleNext}
          size="3"
          variant="success"
          appearance="outline"
        >
          Open the app
        </Button>
      </Container>
    </Grid>
  );
}
