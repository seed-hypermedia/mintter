import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import P from '../../components/welcome-p'
import Button from '../../components/welcome-button'
import Footer from '../../components/footer'
import Content from '../../components/content'

export default function CreatePassword() {
  return (
    <Layout>
      <Container>
        <Heading>Welcome!</Heading>
        <P className="text-center">
          Set a password to encrypt your identity. This password will be needed
          to unlock your identity in the future
        </P>
        <Content className="flex-wrap flex w-full flex-col">
          <div className="flex-1 mb-6">
            <label
              className="block text-gray-300 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              className="shadow appearance-none border border-red-500 rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="******************"
            />
            <p className="text-red-500 text-xs italic">
              Please choose a password.
            </p>
          </div>
          <div className="flex-1">
            <label
              className="block text-gray-300 text-sm font-bold mb-2"
              htmlFor="repeat_password"
            >
              Retype Password
            </label>
            <input
              className="shadow appearance-none border border-red-500 rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="repeat_password"
              type="password"
              placeholder="******************"
            />
            <p className="text-red-500 text-xs italic">
              Please choose a password.
            </p>
          </div>
        </Content>
      </Container>
      <Footer className="flex-none">
        <Container>
          <Button href="/welcome/create-password">Next</Button>
        </Container>
      </Footer>
    </Layout>
  )
}
