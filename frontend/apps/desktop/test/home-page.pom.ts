import {AppData} from './types'

export class HomePage {
  readonly appData: AppData
  alias: string

  constructor(data: AppData, alias = 'testAlias') {
    this.appData = data
    this.alias = alias
  }

  async goto() {
    await this.appData.appWindow.waitForSelector('#btn-new-account')
    await this.appData.appWindow
      .getByRole('button', {
        name: 'Create a new Account',
      })
      .click({force: true})

    await this.appData.appWindow.locator('#btn-tab-ownwords').click()
    await this.appData.appWindow
      .locator('#ownwords-input')
      .fill(
        'rib canal floor bubble hundred wild bring olive minimum veteran tip snack',
      )
    await this.appData.appWindow.locator('#check3').check()
    await this.appData.appWindow.locator('#btn-next').click()
    await this.appData.appWindow.waitForTimeout(10)
    await this.appData.appWindow.locator('#alias').fill(this.alias)
    await this.appData.appWindow.locator('#btn-next').click()
    await this.appData.appWindow.locator('#btn-next').click()
    await this.appData.appWindow.waitForTimeout(10)
    await this.appData.appWindow.locator('#btn-next').click()
    await this.appData.appWindow.waitForTimeout(10)
    await this.appData.appWindow.locator('#btn-skip').click()
  }
}
