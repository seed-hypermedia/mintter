import {Publication} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {paragraph, statement, text} from '@app/mttast'
import {createTestQueryClient} from '@app/test/utils'

// TODO: FIXME
describe.skip('Publication Page', () => {
  it.only('should render Publication', () => {
    let date = new Date()
    let publication: Publication = {
      version: '1',
      document: {
        id: 'foo',
        title: 'test demo',
        subtitle: 'test subtitle',
        author: '',
        updateTime: date,
        createTime: date,
        publishTime: date,
        children: [
          {
            block: blockToApi(
              statement({id: 'block'}, [paragraph([text('Hello World')])]),
            ),
            children: [],
          },
        ],
      },
    }

    let {client} = createTestQueryClient({
      publication,
    })

    cy.mount(<div>hello publication</div>, {
      path: '/p/d1/v1',
      client,
    })
  })
})
