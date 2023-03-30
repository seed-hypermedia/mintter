import {
  paragraph,
  statement,
  text,
  blockToApi,
  BlockNode,
} from '@mintter/shared'
import {createTestDraft, createTestQueryClient} from '@app/test/utils'
import DraftPage from '../draft'
import {useMainActor} from '@app/hooks/main-actor'
import {useNavRoute} from '@app/utils/navigation'
describe('Draft Page', () => {
  it('should render the draft', () => {
    let {client, draft} = createTestQueryClient({
      draft: createTestDraft({
        children: [
          new BlockNode({
            block: blockToApi(
              statement({id: 'b1'}, [paragraph([text('Hello World')])]),
            ),
            children: [],
          }),
        ],
      }),
    })
    cy.mount(<TestDraft client={client} />, {
      client,
      path: `/d/${draft?.id}`,
    })
      //.wait(1000)
      .get('[data-testid="draft-wrapper"]')
      .contains('Hello World')
  })

  it.skip('should publish draft', () => {
    let {client, draft} = createTestQueryClient({
      draft: createTestDraft({
        children: [
          new BlockNode({
            block: blockToApi(
              statement({id: 'b1'}, [paragraph([text('Hello World')])]),
            ),
            children: [],
          }),
        ],
      }),
    })
    let mockPublish = cy.stub()
    cy.mount(<TestDraft publishDraft={mockPublish} client={client} />, {
      client,
      path: `/d/${draft?.id}`,
    })
      // .wait(1000)
      .get('[data-testid="button-publish"]')
      .click()
      .then(() => {
        // expect(mockPublish).to.be.calledOnceWith(draft?.id)
      })
  })
})

function TestDraft({publishDraft, client}: any) {
  let mainActor = useMainActor({shouldAutosave: false, client, publishDraft})
  const route = useNavRoute()
  if (route.key !== 'draft') return null
  return (
    <>
      {() =>
        mainActor?.type == 'draft' ? (
          <DraftPage draftActor={mainActor?.actor} editor={mainActor.editor} />
        ) : null
      }
    </>
  )
}
