import React from 'react'
import Heading from 'components/welcome-heading'
import Container from 'components/welcome-container'
import P from 'components/welcome-p'
import {NextButton} from 'components/welcome-buttons'
import Footer from 'components/footer'
import {useWelcome} from 'shared/welcome-provider'
import {useProfile} from 'shared/profile-context'
import {useRouter} from 'shared/use-router'
import {getPath} from 'components/routes'

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
      <Container className="mx-auto">
        <Heading>Welcome to Mintter!</Heading>
        <P>some kind words here</P>
      </Container>
      <Footer className="flex-none">
        <Container className="mx-auto">
          <NextButton
            onClick={handleNext}
            className="text-2xl font-light px-10"
          >
            start
          </NextButton>
        </Container>
      </Footer>
    </>
  )
}
