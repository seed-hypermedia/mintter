import React from 'react'
import {useHistory} from 'react-router-dom'
import Heading from 'components/welcome-heading'
import Container from 'components/welcome-container'
import P from 'components/welcome-p'
import {NextButton} from 'components/welcome-buttons'
import Footer from 'components/footer'
import {useWelcome} from 'shared/welcomeProvider'
import {useProfile} from 'shared/profileContext'

export default function WelcomeIntro() {
  const history = useHistory()
  const {data: profile} = useProfile()
  const {dispatch} = useWelcome()

  React.useEffect(() => {
    if (profile) {
      // check is profile is available. this is the only place where I'm redirecting to the linrary from within the welcome process
      history.replace('/library/feed')
    }
  }, [])

  function handleNext() {
    // set the welcome progress
    dispatch({type: 'progress', payload: 1})
    //send the user to next page
    history.replace('/private/welcome/security-pack')
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
