import {AppData} from './types'

export class OnboardingPage {
  readonly appData: AppData

  constructor(data: AppData) {
    this.appData = data
  }

  // No need for a `goto` method here because we assume we land here in the first place when the app has no account
}
