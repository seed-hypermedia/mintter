import {Heading} from 'components/heading'
import {Container} from 'components/container'
import P from 'components/welcome-p'
import {Button} from 'components/button'
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
          <Button
            onClick={handleNext}
            size="3"
            variant="success"
            appearance="outline"
          >
            Open the app
          </Button>
        </Container>
      </Footer>
    </>
  )
}
