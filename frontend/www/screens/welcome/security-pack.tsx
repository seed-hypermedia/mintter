import {useState, useEffect} from 'react'
import {useToasts} from 'react-toast-notifications'
import {CopyToClipboard} from 'react-copy-to-clipboard'
import {useWelcome} from 'shared/welcome-provider'
import {useProfileContext} from 'shared/profile-context'
import {useRouter} from 'shared/use-router'
import {welcomeGrid} from './intro'
import {Container} from 'components/container'
import {Heading} from 'components/heading'
import {NextButton, BackButton} from 'components/button'
import {getPath} from 'components/routes'
import {Button} from 'components/button'
import {Box} from 'components/box'
import {Grid} from 'components/grid'
import {Text} from 'components/text'

// TODO: (horacio): refactor rpc to not have it here
export default function SecurityPack() {
  const [error, setError] = useState<{code: number; message: string}>()
  const {genSeed, createProfile} = useProfileContext()
  const [words, setWords] = useState<string[]>([])
  const {history, match} = useRouter()
  const {dispatch} = useWelcome()

  async function handleRPC() {
    try {
      const resp = await genSeed()
      setWords(resp.getMnemonicList())
    } catch (err) {
      setError(err)
      console.error('something went wrong...', err)
    }
  }

  useEffect(() => {
    handleRPC()
  }, [])

  async function handleNext() {
    // store seed to the user
    dispatch({type: 'mnemonicList', payload: words})
    //send the user to next page
    // history.replace('/welcome/retype-seed')
    try {
      createProfile({
        mnemonicList: words,
        walletPassword: '',
        aezeedPassphrase: '',
      })
      history.replace(`${getPath(match)}/welcome/edit-profile`)
    } catch (err) {
      throw new Error(err)
    }
  }

  return (
    <Grid className={welcomeGrid}>
      <Container
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '$7',
        }}
      >
        <Heading>Security Pack</Heading>
        <Text>
          Please save these 24 words securely! This will allow you to recreate
          your account
        </Text>
        <MnemonicWords words={words} error={error} />
      </Container>
      <Container
        css={{
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <NextButton disabled={words.length === 0} onClick={handleNext}>
          Next →
        </NextButton>
        <BackButton to={`${getPath(match)}/welcome`}>← start over</BackButton>
      </Container>
    </Grid>
  )
}

export function MnemonicWords({
  words,
  error,
}: {
  words?: string[]
  error?: {code: number; message: string}
}) {
  const {addToast} = useToasts()
  return (
    <>
      <Box data-testid="mnemonic-list">
        {error ? (
          error.message
        ) : (
          <Box
            as="ol"
            css={{
              height: 'calc($7 * 9)',
              columns: '3',
              columnGap: '$4',
            }}
          >
            {words.map((word, wordIdx) => (
              <Grid
                as="li"
                css={{
                  display: 'flex',
                  height: '$7',
                  placeItems: 'center',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  marginBottom: '$1',

                  gap: '$1',
                  alignSelf: 'center',
                }}
                key={wordIdx}
              >
                <Text size="1">{wordIdx + 1}.</Text>
                <Text size="3">{word}</Text>
              </Grid>
            ))}
          </Box>
        )}
      </Box>
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
