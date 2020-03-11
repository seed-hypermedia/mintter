import {useEffect, useState} from 'react'
import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import {NextButton, BackButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import Content from '../../components/content'
import P from '../../components/welcome-p'
import {css} from 'emotion'
import {useRPC} from '../../shared/rpc'
import {GenSeedRequest} from '@mintter/proto/mintter_pb'
import {useUser} from '../../shared/userContext'

export default function SecurityPack() {
  const [error, setError] = useState<{code: number; message: string}>()
  const rpc = useRPC()
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const {setUser} = useUser()

  useEffect(() => {
    async function handleRPC() {
      const req = new GenSeedRequest()
      try {
        req.setAezeedPassphrase('test')
        const resp = await rpc.accounts.genSeed(req)
        setMnemonic(resp.getMnemonicList())
      } catch (err) {
        setError(err)
        console.error('something went wrong...', err)
      }
    }

    handleRPC()
  }, [])

  function splitWords(arr) {
    const temp = [...arr]
    const res = []

    while (temp.length) {
      res.push(temp.splice(0, 6))
    }

    return res
  }

  function handleNext() {
    // store seed to the user
    setUser({seed: mnemonic})

    //send the user to next page
  }

  // mnemonic words separated into lists
  const lists = splitWords(mnemonic)

  return (
    <>
      <Container>
        <Heading>Security Pack</Heading>
        <P className="text-center">
          Please save these 24 words securely! This will allow you to recreate
          your identity ID
        </P>
        <Content className="flex-wrap flex w-full">
          {error
            ? error.message
            : lists.map((list, list_idx) => (
                <div
                  key={list_idx}
                  className={`w-1/2 flex-1 flex flex-col md:order-none ${css`
                    min-width: 162px;
                    margin-top: -12px;
                    align-items: start;
                    padding-left: 30%;

                    @media (min-width: 396px) {
                      min-width: 50%;
                      order: ${list_idx % 2 == 0 ? '1' : '2'};
                      margin-top: ${list_idx % 2 == 0 ? '0' : '-12px'};
                      align-items: center;
                      padding-left: 0;
                    }

                    @media (min-width: 768px) {
                      min-width: 0;
                      order: 0;
                      margin-top: 0;
                    }
                  `}`}
                >
                  <ol>
                    {list.map((word, word_idx) => (
                      <li key={word_idx} className="my-3 flex items-baseline">
                        <span
                          className={`text-bold text-gray-500 text-xs ${css`
                            width: 24px;
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
          <div className="flex w-full justify-between">
            <BackButton
              to="/welcome"
              onClick={() => console.log('starting over!')}
            >
              ← start over
            </BackButton>
            <NextButton onClick={handleNext}>Next →</NextButton>
          </div>
        </Container>
      </Footer>
    </>
  )
}

SecurityPack.Layout = Layout
