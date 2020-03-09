import Heading from '../../components/welcome-heading'
import Content from '../../components/content'
import Button from '../../components/button'
import Container from '../../components/welcome-container'
import Layout from '../../components/welcome-layout'
import P from '../../components/welcome-p'
import {NextButton, BackButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'

export default function WelcomeIndex() {
  return (
    <Layout>
      <Container className="lg:flex-1">
        <Heading>Welcome to Mintter!</Heading>
        <P>some kind words here</P>
      </Container>
      <Footer className="flex-none">
        <Container>
          <NextButton
            to="/welcome/security-pack"
            className="text-2xl font-light px-10"
          >
            start
          </NextButton>
        </Container>
      </Footer>
    </Layout>
  )
}
