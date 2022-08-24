import {Root} from '@app/root'
import {mountProviders} from '@app/test/utils'

// TODO: FIXME
describe.skip('PublicationList', () => {
  it('Should show an empty list', () => {
    const {render} = mountProviders({
      initialRoute: '/publications',
    })

    render(<Root />)
  })
})
