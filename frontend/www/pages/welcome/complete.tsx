import Heading from '../../components/welcome-heading'
import Container from '../../components/welcome-container'
import Layout from '../../components/welcome-layout'
import P from '../../components/welcome-p'
import {NextButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import WelcomeButton from '../../components/button'

export default function WelcomeIndex() {
  return (
    <>
      <Container className="lg:flex-1">
        <Heading>Complete!</Heading>
        <P>you can go to the app now</P>
      </Container>
      <Footer className="flex-none">
        <Container>
          <NextButton to="/app/library" className="text-2xl font-light px-10">
            Open the app
          </NextButton>
        </Container>
      </Footer>
    </>
  )
}

WelcomeIndex.Layout = Layout
