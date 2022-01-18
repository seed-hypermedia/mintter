import {Box} from '@components/box'
import {useMachine} from '@xstate/react'
import {useMemo} from 'react'
import {createMachine} from 'xstate'
import type {OnboardingStepPropsType} from './common'
import {Complete} from './complete'
import {ProfileInformation} from './profile-information'
import {SecurityPack} from './security-pack'
import {Welcome} from './welcome'

let onboardingMachine = createMachine({
  id: 'onboarding',
  initial: 'welcome',
  states: {
    // loading: {
    //   on: {
    //     NEXT: 'welcome',
    //   },
    // },
    welcome: {
      on: {
        NEXT: 'securityPack',
      },
    },
    securityPack: {
      on: {
        PREV: 'welcome',
        NEXT: 'profileInformation',
      },
    },
    profileInformation: {
      on: {
        PREV: 'securityPack',
        NEXT: 'complete',
      },
    },
    complete: {
      type: 'final',
    },
  },
})

export default function OnboardingPage({machineConfig = {}}: {machineConfig?: any}) {
  const [onboardingMachineState, send] = useMachine(() => onboardingMachine.withConfig(machineConfig))

  const onboardingStepProps: OnboardingStepPropsType = useMemo(
    () => ({
      prev: () => send('PREV'),
      next: () => send('NEXT'),
    }),
    [send],
  )

  return (
    <Box
      css={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <Box
        css={{
          backgroundColor: '$background-alt',
          borderRadius: '24px',
          boxShadow: '$3',
          display: 'flex',
          maxWidth: 800,
          minHeight: 745,
          paddingBottom: 56,
          paddingHorizontal: 80,
          paddingTop: 112,
          width: '100%',
        }}
      >
        {onboardingMachineState.matches('welcome') && <Welcome {...onboardingStepProps} />}
        {onboardingMachineState.matches('securityPack') && <SecurityPack {...onboardingStepProps} />}
        {onboardingMachineState.matches('profileInformation') && <ProfileInformation {...onboardingStepProps} />}
        {onboardingMachineState.matches('complete') && <Complete />}
      </Box>
    </Box>
  )
}
