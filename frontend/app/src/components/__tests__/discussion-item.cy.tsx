import {Publication} from '@app/client'
import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {blockToApi} from '@app/client/v2/block-to-api'
import {queryKeys} from '@app/hooks'
import {paragraph, statement, text} from '@app/mttast'
import {createTestQueryClient, TestPublicationProvider} from '@app/test/utils'
import {DiscussionItem} from '@components/discussion-item'

it('Discussion Item', () => {
  let publication: Publication = {
    version: 'v1',
    document: {
      id: '1',
      title: 'document 1',
      subtitle: '',
      author: 'testauthor',
      createTime: new Date(),
      updateTime: new Date(),
      publishTime: new Date(),
      children: [
        {
          block: blockToApi(
            statement({id: 'b1'}, [paragraph([text('Hello World')])]),
          ),
          children: [],
        },
      ],
    },
  }

  let {client} = createTestQueryClient({
    publicationList: [publication],
    authors: [
      {
        id: 'testauthor',
        profile: {
          alias: 'test author',
        },
      },
    ],
  })

  client.setQueryData<Publication>(
    [queryKeys.GET_PUBLICATION, publication.document?.id, publication.version],
    publication,
  )

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

  let mockClick = cy.stub()

  cy.mount(
    <TestPublicationProvider>
      <DiscussionItem
        link={{
          target: undefined,
          source: {
            documentId: '1',
            version: 'v1',
            blockId: 'b1',
          },
        }}
        handleClick={mockClick}
      />
    </TestPublicationProvider>,
    {
      client,
    },
  )
    .get('[data-testid="discussion-item-wrapper"]')
    .click()
    .then(() => {
      expect(mockClick).to.be.called
    })
    .get('[data-testid="discussion-item-alias"]')
    .contains('test author')
    .get('[data-testid="discussion-item-date"]')
    .should('not.be.empty')
})
