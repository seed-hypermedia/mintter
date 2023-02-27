import {
  generateMnemonic as defaultGenerateMnemonic,
  registerAccount,
} from '@mintter/shared'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {useQuery} from '@tanstack/react-query'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useCallback, useState} from 'react'
import toast from 'react-hot-toast'
import {
  IconContainer,
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
} from './common'
// import {bech32m, bech32} from 'bech32'
// import BIP32Factory from 'bip32'
import {mnemonicToSeed, getDefaultWordlist, wordlists} from 'bip39'
// import * as ecc from 'tiny-secp256k1'
// You must wrap a tiny-secp256k1 compatible implementation
// const bip32 = BIP32Factory(ecc)
import {Buffer} from 'buffer'

global.Buffer = global.Buffer || Buffer

const wl = (global.wl = wordlists['english'])
console.log({wl})

export function SecurityPack({
  prev,
  next,
  generateMnemonic = defaultGenerateMnemonic,
}: OnboardingStepPropsType) {
  const [ownSeed, setOwnSeed] = useState<string>('')
  const [useOwnSeed, toggleOwnSeed] = useState<boolean>(false)
  const mnemonics = useQuery({
    queryKey: ['onboarding', 'mnemonics'],
    queryFn: async () => {
      console.log('hi')
      const data = await generateMnemonic()
      console.log('hah', data?.mnemonic)

      mnemonicToSeed(data.mnemonic.join(' '))
        .then((seed) => {
          // console.log({seed, len: seed.length})
          // const outKey = bech32.encode('nsec', seed)
          console.log({seed})
        })
        .catch((e) => {
          console.error('yep: ', e)
        })
      // console.log({seed})
      return data.mnemonic
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const handleSubmit = useCallback(async () => {
    const words =
      useOwnSeed && ownSeed
        ? ownSeed
            .split(' ')
            .map((s) => s.split(','))
            .flat(1)
        : mnemonics.data
    if (words) {
      try {
        // words are here.

        await registerAccount(words)
        next()
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message)
        }
      }
    } else {
      toast.error('no words have being received?')
    }
  }, [useOwnSeed, ownSeed, mnemonics, next])

  return (
    <OnboardingStep>
      <OnboardingStepTitle icon={<SecurityPackIcon />}>
        Security Pack
      </OnboardingStepTitle>
      <OnboardingStepDescription>
        Please save these words securely! This will allow you to recreate your
        account and recover associated funds:
      </OnboardingStepDescription>
      {useOwnSeed ? (
        <TextField
          textarea
          id="ownSeed"
          name="ownSeed"
          label="Your bip39 mnemonic words"
          rows={5}
          placeholder="food barrrel buzz ..."
          hint="words separated by spaces or commas"
          data-testid="textarea-own-seed"
          value={ownSeed}
          onChange={(e) => setOwnSeed(e.target.value)}
        />
      ) : mnemonics.isError ? (
        <OnboardingStepBody>
          <Text color="danger" css={{textAlign: 'center'}}>
            {mnemonics.error.message}
          </Text>
        </OnboardingStepBody>
      ) : (
        <MnemonicList words={mnemonics.data ?? []} />
      )}
      <Button
        type="button"
        color="muted"
        variant="outlined"
        onClick={() => toggleOwnSeed((v) => !v)}
        data-testid="button-toogle-custom-seed"
      >
        Setting up a new device?{' '}
        <Text css={{textDecoration: 'underline', display: 'inline-block'}}>
          provide your own seed
        </Text>
      </Button>
      <OnboardingStepActions>
        <OnboardingStepButton
          variant="outlined"
          onClick={prev}
          data-testid="prev-btn"
        >
          Back
        </OnboardingStepButton>
        <OnboardingStepButton
          disabled={mnemonics.isLoading || !mnemonics.data?.length}
          onClick={handleSubmit}
          data-testid="next-btn"
        >
          Next
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  )
}

function MnemonicList({words}: {words: string[]}) {
  function onCopy() {
    copyTextToClipboard(words.join(','))
    toast.success('Words copied to your clipboard!')
  }

  return (
    <OnboardingStepBody
      css={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '$7',
        width: '100%',
      }}
    >
      <Box
        css={{
          columnGap: '$4',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          rowGap: '$3',
          width: '100%',
        }}
      >
        {words.map((word, wordIdx) => (
          <Box
            key={`${wordIdx}-${word}`}
            css={{
              alignItems: 'baseline',
              display: 'flex',
              gap: '$2',
              justifyContent: 'center',
            }}
          >
            <Text size="1" color="muted">
              {wordIdx + 1}.
            </Text>
            <Text size="3">{word}</Text>
          </Box>
        ))}
      </Box>

      <Button
        type="button"
        size="2"
        color="success"
        variant="outlined"
        onClick={() => onCopy()}
      >
        Copy words to clipboard
      </Button>
    </OnboardingStepBody>
  )
}

export function SecurityPackIcon() {
  return (
    <IconContainer>
      <svg
        width="34"
        height="40"
        viewBox="0 0 30 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 34.6666C15 34.6666 28.3334 28 28.3334 18V6.33331L15 1.33331L1.66669 6.33331V18C1.66669 28 15 34.6666 15 34.6666Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconContainer>
  )
}
