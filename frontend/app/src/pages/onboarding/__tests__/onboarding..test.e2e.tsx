import {AppProviders} from '@app/app-providers'
import {cleanup, render, screen, Screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {createModel} from '@xstate/test'
import {createMachine} from 'xstate'
import OnboardingPage from '..'

describe('Onboarding Process', () => {
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
        meta: {
          test: async (screen: Screen) => {
            await screen.queryByText(/welcome to mintter/i)
          },
        },
      },
      securityPack: {
        on: {
          PREV: 'welcome',
          NEXT: 'profileInformation',
        },
        meta: {
          test: async (screen: Screen) => {
            await screen.queryByText(
              /Please save these 24 words securely! This will allow you to recreate your account/i,
            )
          },
        },
      },
      profileInformation: {
        on: {
          PREV: 'securityPack',
          NEXT: 'complete',
        },
        meta: {
          test: async (screen: Screen) => {
            await screen.queryByText(
              /Link your personal data with your new Mintter account. You can fill this information later if you prefer/i,
            )
          },
        },
      },
      complete: {
        type: 'final',
        meta: {
          test: async (screen: Screen) => {
            await screen.queryByText(
              /You just created your Mintter account. Please share it with others and help us spread the word/i,
            )
          },
        },
      },
    },
  })

  const testModel = createModel(onboardingMachine).withEvents({
    NEXT: async () => {
      await userEvent.click(screen.getByTestId('next-btn'))
    },
    PREV: async () => {
      await userEvent.click(screen.getByTestId('prev-btn'))
    },
  })

  let testPlans = testModel.getSimplePathPlans()

  testPlans.forEach((plan, i) => {
    describe(plan.description, () => {
      afterEach(cleanup)
      plan.paths.forEach((path, i) => {
        test(
          path.description,
          async () => {
            render(
              <AppProviders>
                <OnboardingPage />
              </AppProviders>,
            )
            await path.test(screen)
          },
          10000,
        )
      })
    })
  })

  it('coverage', () => {
    testModel.testCoverage()
  })
})
