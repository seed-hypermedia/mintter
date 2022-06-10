import {App} from '@app/app'
import {mountProviders} from '@app/test/utils'

describe('DraftList', () => {
  it('Should show an empty list', () => {
    const {render} = mountProviders({
      initialRoute: '/drafts',
    })

    render(<App />)
  })
})
