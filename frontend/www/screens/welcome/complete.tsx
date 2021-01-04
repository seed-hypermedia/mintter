import Heading from 'components/welcome-heading'
import Container from 'components/welcome-container'
import P from 'components/welcome-p'
import {NextButton} from 'components/welcome-buttons'
import Footer from 'components/footer'
import {useRouter} from 'shared/use-router'
import {useWelcome} from 'shared/welcome-provider'
import {getPath} from 'components/routes'

export default function WelcomeIndex() {
  const {history, match} = useRouter()
  const {dispatch} = useWelcome()

  function handleNext() {
    dispatch({type: 'reset'})
    history.push(`${getPath(match)}/library/feed`)
  }

  return (
    <>
      <Container className="mx-auto">
        <Heading>Complete!</Heading>
        <P>
          you just create your Mintter account!. Please share it with others and
          the world!!
        </P>
      </Container>
      <Footer className="flex-none">
        <Container className="mx-auto">
          <NextButton
            onClick={handleNext}
            className="text-2xl font-light px-10"
          >
            Open the app
          </NextButton>
        </Container>
      </Footer>
    </>
  )
}
