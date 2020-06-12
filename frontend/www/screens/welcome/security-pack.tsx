import {useState, useEffect, useMemo} from 'react'
import Container from 'components/welcome-container'
import Heading from 'components/welcome-heading'

import Footer from 'components/footer'
import Content from 'components/content'
import P from 'components/welcome-p'
import {css} from 'emotion'
import {GenSeedRequest} from '@mintter/proto/mintter_pb'
import {useHistory} from 'react-router-dom'
import Input from 'components/input'
import Button from 'components/button'
import {NextButton, BackButton} from 'components/welcome-buttons'
import {useForm} from 'react-hook-form'
import {useWelcome} from 'shared/welcomeProvider'
import {useFocus} from 'shared/hooks'
import {usersClient, MintterPromiseClient} from 'shared/mintterClient'

interface SecurityPackProps {
  rpc?: MintterPromiseClient
}
// TODO: (horacio): refactor rpc to not have it here
export default function SecurityPack({rpc = usersClient}: SecurityPackProps) {
  const [error, setError] = useState<{code: number; message: string}>()
  // const {focusFirst} = useFocus()
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const history = useHistory()
  const {dispatch} = useWelcome()
  const {register, handleSubmit} = useForm({
    mode: 'onChange',
  })

  async function handleRPC({passphrase}) {
    const req = new GenSeedRequest()
    if (passphrase) {
      dispatch({type: 'aezeedPassphrase', payload: passphrase})
    }
    try {
      req.setAezeedPassphrase(passphrase)
      const resp = await rpc.genSeed(req)
      setMnemonic(resp.getMnemonicList())
    } catch (err) {
      setError(err)
      console.error('something went wrong...', err)
    }
  }

  useEffect(() => {
    handleRPC({passphrase: ''})
  }, [])

  function splitWords(arr: string[]): string[][] {
    const temp = [...arr]
    const res = []

    while (temp.length) {
      res.push(temp.splice(0, 6))
    }

    return res
  }

  function handleNext() {
    // store seed to the user
    dispatch({type: 'mnemonicList', payload: mnemonic})
    //send the user to next page
    history.replace('/welcome/retype-seed')
  }

  // mnemonic words separated into lists
  const lists = useMemo(() => splitWords(mnemonic), [mnemonic])
  return (
    <>
      <Container>
        <Heading>Security Pack</Heading>
        <P className="text-center">
          Please save these 24 words securely! This will allow you to recreate
          your account
        </P>
        <Content className="flex-wrap flex w-full">
          {/* {mnemonic.length === 0 ? (
            <div className="flex-col flex-1 max-w-xs mx-auto">
              <form>
                <label
                  className="block text-gray-500 text-xs font-semibold mb-1"
                  htmlFor="passphrase"
                >
                  Passphrase?
                </label>
                <Input
                  id="passphrase"
                  type="password"
                  name="passphrase"
                  ref={e => {
                    focusFirst(e)
                    register(e)
                  }}
                />
                <Button
                  className="w-full mt-4 text-success transition duration-200 border border-success opacity-100 hover:bg-success hover:border-success hover:text-white transition-all"
                  type="submit"
                  onClick={handleSubmit(handleRPC)}
                >
                  Generate security pack
                </Button>
              </form>
            </div>
          ) : ( */}
          <MnemonicWords lists={lists} error={error} />
          {/* )} */}
        </Content>
      </Container>
      <Footer className="flex-none">
        <Container>
          <div className="flex w-full justify-between flex-row-reverse">
            <NextButton disabled={mnemonic.length === 0} onClick={handleNext}>
              Next →
            </NextButton>
            <BackButton to="/welcome">← start over</BackButton>
          </div>
        </Container>
      </Footer>
    </>
  )
}

export function MnemonicWords({
  lists,
  error,
}: {
  lists?: string[][]
  error?: {code: number; message: string}
}) {
  function handleCopy() {
    alert(
      lists
        .flat()
        .map((w, i) => `${i + 1}. ${w}\n`)
        .join(''),
    )
  }

  return (
    <>
      <div className="flex-wrap flex w-full" data-testid="mnemonic-list">
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
                        className={`text-bold text-body-muted ${css`
                          font-size: 0.65rem;
                          width: 24px;
                          display: inline-block;
                        `}`}
                      >
                        {list_idx * 6 + word_idx + 1}.
                      </span>
                      <span className="text-body">{word}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
      </div>
      <Button
        className="mx-auto mt-4 text-success transition duration-200 border border-success opacity-100 hover:bg-success hover:border-success hover:text-white transition-all"
        type="submit"
        onClick={handleCopy}
      >
        Copy and Save it securely!
      </Button>
    </>
  )
}
