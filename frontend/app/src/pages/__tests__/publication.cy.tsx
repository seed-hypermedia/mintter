import {App} from '@app/app'
import {Publication} from '@app/client'
import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {blockToApi} from '@app/client/v2/block-to-api'
import {queryKeys} from '@app/hooks'
import {paragraph, statement, text} from '@app/mttast'
import {mountProviders} from '@app/test/utils'

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
        content: '',
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

    const {render, client} = mountProviders({
      initialRoute: '/p/foo/1',
      publication,
    })

    client.setQueryData<ListCitationsResponse>(
      [
        queryKeys.GET_PUBLICATION_DISCUSSION,
        publication.document?.id,
        publication.version,
      ],
      {
        links: [],
      },
    )

    render(<App />)
  })
})
