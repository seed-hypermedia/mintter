import React from 'react'
import {Heading} from 'components/heading'
import {Container} from 'components/container'
import {useWelcome} from 'shared/welcome-provider'
import {useProfile} from 'shared/profile-context'
import {useRouter} from 'shared/use-router'
import {getPath} from 'components/routes'
import {Button} from 'components/button'
import {Grid} from 'components/grid'
import {css} from 'shared/stitches.config'
import {Text} from 'components/text'

export const welcomeGrid = css({
  width: '100%',
  height: '100%',
  gridTemplateColumns: '1fr',
  gridRowStart: '2',
  gridTemplateRows: '[welcome-body] 1fr [welcome-footer] 100px',
})

export default function WelcomeIntro() {
  const {history, match} = useRouter()
  const {data: profile} = useProfile()
  const {dispatch} = useWelcome()

  React.useEffect(() => {
    if (profile) {
      // check is profile is available. this is the only place where I'm redirecting to the linrary from within the welcome process
      history.replace(`${getPath(match)}/library/feed`)
    }
  }, [])

  function handleNext() {
    // set the welcome progress
    dispatch({type: 'progress', payload: 1})
    //send the user to next page
    history.replace(`${getPath(match)}/welcome/security-pack`)
  }
  return (
    <>
      <Grid className={welcomeGrid}>
        <Container
          css={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '$4',
          }}
        >
          <Heading>Welcome to Mintter!</Heading>
          <Text>some kind words here</Text>
        </Container>
        <Container css={{display: 'flex', justifyContent: 'center'}}>
          <Button
            size="3"
            appearance="pill"
            variant="success"
            css={{minWidth: '9'}}
            onClick={handleNext}
          >
            Start
          </Button>
        </Container>
      </Grid>
    </>
  )
}
