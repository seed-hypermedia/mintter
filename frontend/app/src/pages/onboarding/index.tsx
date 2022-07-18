import {store} from '@app/client/store'
import {Box} from '@components/box'
import {useMachine} from '@xstate/react'
import {useMemo} from 'react'
import {createMachine} from 'xstate'
import type {OnboardingStepPropsType} from './common'
import {Complete} from './complete'
import {ProfileInformation} from './profile-information'
import {SecurityPack} from './security-pack'
import {Welcome} from './welcome'

type OnboardingContext = {}

type OnboardingEvent =
  | {
      type: 'NEXT'
    }
  | {
      type: 'PREV'
    }

let onboardingMachine = createMachine(
  {
    id: 'onboarding',
    initial: 'welcome',
    tsTypes: {} as import('./index.typegen').Typegen0,
    schema: {
      context: {} as OnboardingContext,
      events: {} as OnboardingEvent,
    },
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
        entry: 'removeStores',
        on: {
          PREV: 'securityPack',
          NEXT: 'complete',
        },
      },
      complete: {
        type: 'final',
      },
    },
  },
  {
    actions: {
      removeStores: () => {
        store.clear()
      },
    },
  },
)

export default function OnboardingPage({
  machineConfig = {},
}: {
  machineConfig?: any
}) {
  const [onboardingMachineState, send] = useMachine(() =>
    onboardingMachine.withConfig(machineConfig),
  )

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
        position: 'absolute',
        top: 0,
        left: 0,
        width: '$full',
        height: '$full',
        backgroundColor: '$base-background-normal',
      }}
    >
      <Box
        css={{
          backgroundColor: '$base-background-subtle',
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
        {onboardingMachineState.matches('welcome') && (
          <Welcome {...onboardingStepProps} />
        )}
        {onboardingMachineState.matches('securityPack') && (
          <SecurityPack {...onboardingStepProps} />
        )}
        {onboardingMachineState.matches('profileInformation') && (
          <ProfileInformation {...onboardingStepProps} />
        )}
        {onboardingMachineState.matches('complete') && <Complete />}
      </Box>
    </Box>
  )
}
