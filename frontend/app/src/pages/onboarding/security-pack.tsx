import {
  generateMnemonic as defaultGenerateMnemonic,
  registerAccount,
} from '@app/client'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {useQuery} from '@tanstack/react-query'
import {useCallback, useState} from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'
import type {OnboardingStepPropsType} from './common'
import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepTitle,
  SecurityPackIcon,
} from './common'

export function SecurityPack({
  prev,
  next,
  generateMnemonic = defaultGenerateMnemonic,
}: OnboardingStepPropsType) {
  const [ownSeed, setOwnSeed] = useState<string>('')
  const [useOwnSeed, toggleOwnSeed] = useState<boolean>(false)
  const mnemonics = useQuery<string[], Error>(
    ['onboarding', 'mnemonics'],
    async () => {
      const resp = await generateMnemonic()
      return resp.mnemonic
    },
    {
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  const handleSubmit = useCallback(async () => {
    const words = useOwnSeed && ownSeed ? ownSeed.split(' ') : mnemonics.data
    if (words) {
      try {
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
          placeholder="foo bar baz ..."
          hint="all words separated by ONE SPACE"
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
      <CopyToClipboard
        text={words.join(' ')}
        onCopy={(_, result) => {
          if (result) {
            toast.success('Words copied to your clipboard!')
          } else {
            toast.error('Error while copying to clipboard')
          }
        }}
      >
        <Button type="button" size="2" color="success" variant="outlined">
          Copy words to clipboard
        </Button>
      </CopyToClipboard>
    </OnboardingStepBody>
  )
}
