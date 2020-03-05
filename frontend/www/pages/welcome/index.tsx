import Layout from '../../components/welcomeLayout'
import Container from '../../components/welcomeContainer'
import Heading from '../../components/heading'
import Button from '../../components/button'
import Content from '../../components/content'

export default function WelcomeIndex() {
  return (
    <Layout>
      <Container className="flex-1">
        <Heading>Welcome to Mintter!</Heading>
        <p>some kind words here</p>
        <Content>
          <Button href="/welcome/security-pack">Start</Button>
        </Content>
      </Container>
    </Layout>
  )
}
