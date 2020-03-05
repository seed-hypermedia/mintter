import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import Button from '../../components/welcome-button'
import Footer from '../../components/footer'
import Content from '../../components/content'
import P from '../../components/welcome-p'
import {css} from 'emotion'

const words = [
  ['able', 'glove', 'pattern', 'solar', 'magic', 'knock'],
  ['game', 'orange', 'problem', 'guide', 'verb', 'bird'],
  ['shrug', 'write', 'enjoy', 'cool', 'kitten', 'rebuild'],
  ['excuse', 'shine', 'code', 'zero', 'mean', 'anual'],
]

export default function SecurityPack() {
  return (
    <Layout>
      <Container>
        <Heading>Security Pack</Heading>
        <P className="text-center">
          Please save these 24 words securely! This will allow you to recreate
          your identity ID
        </P>
        <Content className="flex-wrap flex w-full">
          {words.map((list, list_idx) => (
            <div key={list_idx} className="flex-1 flex items-center flex-col">
              <ol>
                {list.map((word, word_idx) => (
                  <li key={word_idx} className="text-white my-3">
                    <span
                      className={`text-bold ${css`
                        width: 32px;
                        display: inline-block;
                      `}`}
                    >
                      {list_idx * 6 + word_idx + 1}.
                    </span>
                    {word}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </Content>
      </Container>
      <Footer className="flex-none">
        <Container>
          <Button href="/welcome/retype-seed">Next</Button>
        </Container>
      </Footer>
    </Layout>
  )
}
