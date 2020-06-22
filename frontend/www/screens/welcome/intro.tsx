import {useHistory} from 'react-router-dom'
import Heading from 'components/welcome-heading'
import Container from 'components/welcome-container'
import P from 'components/welcome-p'
import {NextButton} from 'components/welcome-buttons'
import Footer from 'components/footer'
import {useWelcome} from 'shared/welcomeProvider'
import {useProfile} from 'shared/profileContext'
import {useEffect} from 'react'

export default function WelcomeIntro() {
  const history = useHistory()
  const {getProfile()} = useProfile()
  const {dispatch} = useWelcome()

  useEffect(() => {
    if (getProfile()) {
      // check is profile is available. this is the only place where I'm redirecting to the linrary from within the welcome process
      history.replace('/library/feed')
    }
  }, [])
  function handleNext() {
    // set the welcome progress
    dispatch({type: 'progress', payload: 1})
    //send the user to next page
    history.replace('/welcome/security-pack')
  }
  return (
    <>
      <Container className="lg:flex-1">
        <Heading>Welcome to Mintter!</Heading>
        <P>some kind words here</P>
      </Container>
      <Footer className="flex-none">
        <Container>
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
