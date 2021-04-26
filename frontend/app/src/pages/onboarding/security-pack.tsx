import { useCallback } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';

import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';

import { genSeed, initProfile } from '../../mintter-client';
import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepButton,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
  SecurityPackIcon,
} from './common';

export function SecurityPack({ prev, next }: OnboardingStepPropsType) {
  const mnemonics = useQuery<string[], Error>(
    ['onboarding', 'mnemonics'],
    async () => {
      const resp = await genSeed();
      return resp.getMnemonicList();
    },
    {
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const handleSubmit = useCallback(async () => {
    try {
      await initProfile(mnemonics.data);
      next();
    } catch (error) {
      toast.error(error.message);
    }
  }, [mnemonics, next]);

  return (
    <OnboardingStep>
      <OnboardingStepTitle icon={<SecurityPackIcon />}>
        Security Pack
      </OnboardingStepTitle>
      <OnboardingStepDescription>
        Please save these 24 words securely! This will allow you to recreate
        your account:
      </OnboardingStepDescription>
      {mnemonics.isError ? (
        <OnboardingStepBody>
          <Text color="danger" css={{ textAlign: 'center' }}>
            {mnemonics.error.message}
          </Text>
        </OnboardingStepBody>
      ) : (
        <MnemonicList words={mnemonics.data ?? []} />
      )}
      <OnboardingStepActions>
        <OnboardingStepButton variant="outlined" onClick={prev}>
          Back
        </OnboardingStepButton>
        <OnboardingStepButton
          disabled={mnemonics.isLoading || !mnemonics.data?.length}
          onClick={handleSubmit}
        >
          Next
        </OnboardingStepButton>
      </OnboardingStepActions>
    </OnboardingStep>
  );
}

function MnemonicList({ words }: { words: string[] }) {
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
            <Text size="1">{wordIdx + 1}.</Text>
            <Text>{word}</Text>
          </Box>
        ))}
      </Box>
      <CopyToClipboard
        text={words.join(' ')}
        onCopy={(_, result) => {
          if (result) {
            toast.success('Words copied to your clipboard!');
          } else {
            toast.error('Error while copying to clipboard');
          }
        }}
      >
        <Button type="button" size="2" color="success" variant="outlined">
          Copy words to clipboard
        </Button>
      </CopyToClipboard>
    </OnboardingStepBody>
  );
}
