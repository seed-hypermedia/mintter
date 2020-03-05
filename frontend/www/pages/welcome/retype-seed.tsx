import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import P from '../../components/welcome-p'
import Button from '../../components/welcome-button'
import Footer from '../../components/footer'
import Content from '../../components/content'
import {css} from 'emotion'

const words = [
  {
    key: 23,
    value: 'repeat',
  },
  {
    key: 16,
    value: 'rule',
  },
  {
    key: 1,
    value: 'black',
  },
]

export default function RetypeSeed() {
  return (
    <Layout>
      <Container>
        <Heading>Retype your seed</Heading>
        <P className="text-center">
          Your seed is important! If you lose your seed you'll have no way to
          recover your identity. To make sure that you have properly saved your
          seed, please retype the words
        </P>
        <P className="text-center font-bold">23, 16 & 1</P>
        <Content className="flex-wrap flex w-full">
          <div className="flex flex-col items-center w-full">
            {words.map(word => (
              <div key={word.key} className="flex items-center p-3">
                <span className="w-5 text-white font-light text-right mr-4">
                  {word.key}
                </span>
                <input
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-300 leading-tight focus:outline-none focus:shadow-outline bg-transparent"
                />
              </div>
            ))}
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
