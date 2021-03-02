import {useState, useEffect, useMemo} from 'react'
import {css} from 'emotion'
import {Container} from 'components/container'
import {Heading} from 'components/heading'
import {NextButton, BackButton} from 'components/button'
import {useWelcome} from 'shared/welcome-provider'
import {useProfileContext} from 'shared/profile-context'
import {useToasts} from 'react-toast-notifications'
import {useRouter} from 'shared/use-router'
import {getPath} from 'components/routes'
import {CopyToClipboard} from 'react-copy-to-clipboard'
import {Button} from 'components/button'
import {Box} from 'components/box'
import {Grid} from 'components/grid'
import {welcomeGrid} from './intro'
import {Text} from 'components/Text'

// TODO: (horacio): refactor rpc to not have it here
export default function SecurityPack() {
  const [error, setError] = useState<{code: number; message: string}>()
  const {genSeed, createProfile} = useProfileContext()
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const {history, match} = useRouter()
  const {dispatch} = useWelcome()

  async function handleRPC() {
    try {
      const resp = await genSeed()
      setMnemonic(resp.getMnemonicList())
    } catch (err) {
      setError(err)
      console.error('something went wrong...', err)
    }
  }

  useEffect(() => {
    handleRPC()
  }, [])

  function splitWords(arr: string[]): string[][] {
    const temp = [...arr]
    const res = []

    while (temp.length) {
      res.push(temp.splice(0, 6))
    }

    return res
  }

  async function handleNext() {
    // store seed to the user
    dispatch({type: 'mnemonicList', payload: mnemonic})
    //send the user to next page
    // history.replace('/welcome/retype-seed')
    try {
      createProfile({
        mnemonicList: mnemonic,
        walletPassword: '',
        aezeedPassphrase: '',
      })
      history.replace(`${getPath(match)}/welcome/edit-profile`)
    } catch (err) {
      throw new Error(err)
    }
  }

  // mnemonic words separated into lists
  const lists = useMemo(() => splitWords(mnemonic), [mnemonic])
  return (
    <Grid className={welcomeGrid}>
      <Container
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '$4',
        }}
      >
        <Heading>Security Pack</Heading>
        <Text>
          Please save these 24 words securely! This will allow you to recreate
          your account
        </Text>
        <MnemonicWords lists={lists} error={error} />
      </Container>
      <Container>
        <NextButton disabled={mnemonic.length === 0} onClick={handleNext}>
          Next →
        </NextButton>
        <BackButton to={`${getPath(match)}/welcome`}>← start over</BackButton>
      </Container>
    </Grid>
  )
}

export function MnemonicWords({
  lists,
  error,
}: {
  lists?: string[][]
  error?: {code: number; message: string}
}) {
  const {addToast} = useToasts()

  const words = useMemo(
    () =>
      lists
        .flat()
        .map((w, i) => `${i + 1}. ${w}\n`)
        .join(''),
    [lists],
  )
  return (
    <>
      <div className="flex-wrap flex w-full" data-testid="mnemonic-list">
        {error
          ? error.message
          : lists.map((list, listIdx) => (
              <div
                key={listIdx}
                className={`w-1/2 flex-1 flex flex-col md:order-none ${css`
                  min-width: 162px;
                  margin-top: -12px;
                  align-items: start;
                  padding-left: 30%;

                  @media (min-width: 396px) {
                    min-width: 50%;
                    order: ${listIdx % 2 == 0 ? '1' : '2'};
                    margin-top: ${listIdx % 2 == 0 ? '0' : '-12px'};
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
                  {list.map((word, wordIdx) => (
                    <li key={wordIdx} className="my-3 flex items-baseline">
                      <span
                        className={`text-bold text-body-muted ${css`
                          font-size: 0.65rem;
                          width: 24px;
                          display: inline-block;
                        `}`}
                      >
                        {listIdx * 6 + wordIdx + 1}.
                      </span>
                      <span className="text-body">{word}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
      </div>
      <Box css={{display: 'flex', justifyContent: 'center', p: '$4'}}>
        <CopyToClipboard
          text={words}
          onCopy={(_, result) => {
            if (result) {
              addToast('Address copied to your clipboard!', {
                appearance: 'success',
              })
            } else {
              addToast('Error while copying to Clipboard!', {
                appearance: 'error',
              })
            }
          }}
        >
          <Button variant="success" appearance="outline" size="2" type="submit">
            Copy and Save it securely!
          </Button>
        </CopyToClipboard>
      </Box>
    </>
  )
}
