import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';
import { Button } from '@mintter/ui/button';

import {
  OnboardingStep,
  OnboardingStepActions,
  OnboardingStepBody,
  OnboardingStepDescription,
  OnboardingStepPropsType,
  OnboardingStepTitle,
  ProfileInformationIcon,
  SecurityPackIcon,
} from './common';

export const Welcome: React.FC<OnboardingStepPropsType> = ({ next }) => {
  return (
    <OnboardingStep>
      <OnboardingStepTitle>Welcome to Mintter</OnboardingStepTitle>
      <OnboardingStepDescription>
        Joining Mintter is fast and easy, these are the only two steps you need
        to complete:
      </OnboardingStepDescription>
      <OnboardingStepBody
        css={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-evenly',
          width: '100%',
        }}
      >
        <WelcomeStep
          icon={<SecurityPackIcon />}
          title="1. Security Pack"
          description="Secure your identity in our peer-to-peer network"
        />
        <WelcomeStep
          icon={<ProfileInformationIcon />}
          title="2. Profile Information"
          description="Set up your profile providing an alias and an email"
        />
      </OnboardingStepBody>
      <OnboardingStepActions>
        <Button size="large" onClick={next}>
          Start
        </Button>
      </OnboardingStepActions>
    </OnboardingStep>
  );
};

const WelcomeStep: React.FC<{
  icon: JSX.Element;
  title: string;
  description: string;
}> = ({ icon, title, description }) => {
  return (
    <Box
      css={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
      }}
    >
      <Box
        css={{
          alignItems: 'center',
          backgroundColor: '$primary-muted',
          borderRadius: '50%',
          display: 'flex',
          height: 72,
          justifyContent: 'center',
          width: 72,
        }}
      >
        {icon}
      </Box>
      <Text alt variant="h2" css={{ marginTop: '$xl' }}>
        {title}
      </Text>
      <Text css={{ marginTop: '$s', maxWidth: 228 }}>{description}</Text>
    </Box>
  );
};
