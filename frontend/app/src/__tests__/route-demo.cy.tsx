import {App} from '@app/app'
import {mountProviders} from '@app/test/utils'

describe('route demo', () => {
  it('default test', () => {
    let {render} = mountProviders()

    render(<App />)
  })
})
