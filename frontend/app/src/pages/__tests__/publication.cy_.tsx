import {Publication as PublicationType} from '@app/client'
import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {blockToApi} from '@app/client/v2/block-to-api'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import {paragraph, statement, text} from '@app/mttast'
import {createPublicationMachine} from '@app/publication-machine'
import {createTestQueryClient} from '@app/test/utils'
import {QueryClient} from '@tanstack/react-query'
import {useInterpret} from '@xstate/react'
import {Editor} from 'slate'
import PublicationPage from '../publication'

// TODO: FIXME
describe('Publication Page', () => {
  it.skip('should assign the ref to the body', () => {
    // TODO: need to check the blocktools highlighter instead
    let date = new Date()
    let publication: PublicationType = {
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
              statement({id: 'b1'}, [paragraph([text('Hello World')])]),
            ),
            children: [],
          },
        ],
      },
    }

    let {client} = createTestQueryClient({
      publication,
      publicationList: [publication],
      url: `/p/foo/1`,
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

    let editor = buildEditorHook(plugins, EditorMode.Publication)

    cy.mount(
      <TestPublication
        client={client}
        editor={editor}
        publication={publication}
      />,
      {
        path: '/p/d1/v1',
        client,
      },
    )
      .get('[data-block-id="b1"]')
      .trigger('mouseover')
      .then(() => {
        expect(document.body.dataset.hoverRef).to.equal('foo/b1')
      })
  })
})

function TestPublication({
  editor,
  publication,
  client,
}: {
  editor: Editor
  client: QueryClient
  publication: PublicationType
}) {
  let service = useInterpret(() =>
    createPublicationMachine({editor, client, publication}),
  )

  return <PublicationPage publicationRef={service} />
}
