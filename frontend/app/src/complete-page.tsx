import * as React from 'react';
import { Container } from '@components/container';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';
import { useWelcome } from './welcome-provider';
import { welcomeGrid } from './intro-page';
import { useHistory, useRouteMatch } from 'react-router';
import { getPath } from '@utils/routes';

export default function WelcomeIndex() {
  const history = useHistory();
  const match = useRouteMatch();
  const { dispatch } = useWelcome();

  function handleNext() {
    dispatch({ type: 'reset' });
    history.push(`${getPath(match)}/library/feed`);
  }

  return null;
  // <Grid className={welcomeGrid}>
  //   <Container
  //     css={{
  //       display: 'flex',
  //       flexDirection: 'column',
  //       alignItems: 'center',
  //       gap: '$6',
  //     }}
  //   >
  //     <Heading>Complete!</Heading>
  //     <Text>
  //       you just create your Mintter account!. Please share it with others and
  //       the world!!
  //     </Text>
  //   </Container>
  //   <Container css={{ display: 'flex', justifyContent: 'center' }}>
  //     <Button
  //       onClick={handleNext}
  //       size="3"
  //       variant="success"
  //       appearance="outline"
  //     >
  //       Open the app
  //     </Button>
  //   </Container>
  // </Grid>
}
