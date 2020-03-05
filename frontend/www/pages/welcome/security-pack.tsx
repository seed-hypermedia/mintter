import Layout from '../../components/welcomeLayout'
import Container from '../../components/welcomeContainer'
import Heading from '../../components/heading'
import Button from '../../components/button'
import Footer from '../../components/footer'

export default function SecurityPack() {
  return (
    <Layout>
      <Container className="flex-1">
        <Heading>Security Pack</Heading>
        <p>24 works here</p>
      </Container>
      <Footer className="flex-none">
        <Container>
          <Button href="/welcome/security-pack">Next</Button>
        </Container>
      </Footer>
    </Layout>
  )
}
