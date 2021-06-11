import {useCallback, useState} from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'
import {useQuery} from 'react-query'
import {generateSeed, registerAccount} from '@mintter/client'
import {Box, Button, Text, TextField} from '@mintter/ui'
import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
  SecurityPackIcon,
} from './common'

export function SecurityPack({prev, next}: OnboardingStepPropsType): JSX.Element {
  const [ownSeed] = useState<string>('')
  const [useOwnSeed, toggleOwnSeed] = useState<boolean>(false)
  const mnemonics = useQuery<string[], Error>(
    ['onboarding', 'mnemonics'],
    async () => {
      const resp = await generateSeed()
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
        toast.error(error.message)
      }
    } else {
      toast.error('no words have being received?')
    }
  }, [useOwnSeed, ownSeed, mnemonics, next])

  return (
    <OnboardingStep>
      <OnboardingStepTitle icon={<SecurityPackIcon />}>Security Pack</OnboardingStepTitle>
      <OnboardingStepDescription>
        Please save these 24 words securely! This will allow you to recreate your account:
      </OnboardingStepDescription>
      {useOwnSeed ? (
        <TextField
          // TODO: fix types
          // @ts-ignore
          as="textarea"
          id="ownSeed"
          name="ownSeed"
          label="Your Seed"
          rows={5}
          placeholder="foo bar baz ..."
          hint="all words separated by ONE SPACE"
          data-testid="textarea-own-seed"
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
        variant="ghost"
        color="muted"
        onClick={() => toggleOwnSeed((v) => !v)}
        data-testid="button-toogle-custom-seed"
      >
        Setting up a new device?{' '}
        <Text css={{textDecoration: 'underline', display: 'inline-block'}}>provide your own seed</Text>
      </Button>
      <OnboardingStepActions>
        <OnboardingStepButton variant="outlined" onClick={prev}>
          Back
        </OnboardingStepButton>
        <OnboardingStepButton disabled={mnemonics.isLoading || !mnemonics.data?.length} onClick={handleSubmit}>
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
            <Text size="4">{word}</Text>
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
