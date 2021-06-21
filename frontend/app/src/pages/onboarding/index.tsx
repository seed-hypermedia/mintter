import {useEffect, useMemo} from 'react'
import {Machine} from 'xstate'

import {Box} from '@mintter/ui'

import {AppSpinner} from '../../components/app-spinner'

import {useMachine} from '@xstate/react'
import type {OnboardingStepPropsType} from './common'
import {Welcome} from './welcome'
import {SecurityPack} from './security-pack'
import {ProfileInformation} from './profile-information'
import {Complete} from './complete'

const createMachine = (machine = {}) =>
  Machine({
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
    ...machine,
  })

export function OnboardingPage({machine = {}}: {machine?: any}) {
  const [onboardingMachineState, send] = useMachine(createMachine(machine))

  const onboardingStepProps: OnboardingStepPropsType = useMemo(
    () => ({
      prev: () => send('PREV'),
      next: () => send('NEXT'),
    }),
    [send],
  )

  // useEffect(() => {
  //   setTimeout(() => {
  //     onboardingStepProps.next()
  //   }, 1000)
  // }, [onboardingStepProps])

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
        {onboardingMachineState.matches('loading') ? <AppSpinner isCentered /> : null}
        {onboardingMachineState.matches('welcome') ? <Welcome {...onboardingStepProps} /> : null}
        {onboardingMachineState.matches('securityPack') ? <SecurityPack {...onboardingStepProps} /> : null}
        {onboardingMachineState.matches('profileInformation') ? <ProfileInformation {...onboardingStepProps} /> : null}
        {onboardingMachineState.matches('complete') ? <Complete /> : null}
      </Box>
    </Box>
  )
}
