import Heading from '../../components/welcome-heading'
import Content from '../../components/content'
import Button from '../../components/welcome-button'
import Container from '../../components/welcome-container'
import Layout from '../../components/welcome-layout'
import P from '../../components/welcome-p'

export default function WelcomeIndex() {
  return (
    <Layout>
      <Container className="flex-1">
        <Heading>Welcome to Mintter!</Heading>
        <P>some kind words here</P>
        <Content>
          <Button href="/welcome/security-pack">Start</Button>
        </Content>
      </Container>
    </Layout>
  )
}
