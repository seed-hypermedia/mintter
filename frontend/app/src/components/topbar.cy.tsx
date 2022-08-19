/**
 *
 */
describe('Topbar', () => {
  /**
   * -
   * - it should render toggle the library
   * - it should go back and forth the history when clicking arrows
   * - it should render publication title and author
   * - it should copy publication link to clipboard
   * - it should add to bookmarks
   * - it should call edit
   * - it should call new document
   * - it should call reply
   * - it should call review
   * - it should show date metadata
   * - it should render draft title
   */
})
// describe('Topbar', () => {
//   it('default render', () => {
//     let {render} = mountProviders()
//     render(<Topbar />)
//   })

//   it('render Draft Title and Author', () => {
//     let date = new Date()
//     let draft: Document = {
//       id: 'foo',
//       title: 'test demo',
//       subtitle: 'test subtitle',
//       author: 'testauthor',
//       updateTime: date,
//       createTime: date,
//       publishTime: date,
//       children: [],
//     }

//     let client = createTestQueryClient()
//     let mainService = interpret(createMainPageService({client}))

//     let {render, account} = mountProviders({
//       client,
//       mainService,
//       publicationList: [],
//       draftList: [],
//       draft,
//       account: {
//         profile: {
//           alias: 'testauthor',
//           email: '',
//           bio: '',
//         },
//         id: 'testauthor',
//         devices: {},
//       },
//     })

//     let editor = buildEditorHook(plugins, EditorMode.Draft)

//     render(
//       <TestTopbar
//         mainService={mainService}
//         currentFile={spawn(
//           createDraftMachine({client, draft, editor}).withContext({
//             draft,
//             version: null,
//             documentId: draft.id,
//             localDraft: null,
//             errorMessage: '',
//             editor,
//             title: draft.title,
//             author: account,
//           }),
//           `draft-${draft.id}`,
//         )}
//       />,
//     )
//       .get('[data-testid="topbar-title"]')
//       .contains(draft.title)
//       .get('[data-testid="topbar-author"]')
//       .contains(account.profile?.alias ?? '')
//   })

//   it('navigation button should work', () => {
//     let back = cy.stub()
//     let forward = cy.stub()
//     let client = createTestQueryClient()
//     let mainService = interpret(
//       createMainPageService({client}).withConfig({
//         actions: {
//           navigateBack: () => {
//             back()
//           },
//           navigateForward: () => {
//             forward()
//           },
//         },
//       }),
//     )
//     let {render} = mountProviders({
//       client,
//       mainService,
//     })

//     render(<Topbar mainService={mainService} />)
//       .get("[data-testid='history-back']")
//       .click()
//       .get("[data-testid='history-forward']")
//       .click()
//       .then(() => {
//         expect(back).to.have.been.calledOnce
//         expect(forward).to.have.been.calledOnce
//       })
//   })
// })

// type TestTopbarProps = {
//   currentFile: CurrentFile
//   mainService?: typeof defaultMainService
// }

// function TestTopbar({mainService = defaultMainService}: TestTopbarProps) {
//   let [mainState] = useActor(mainService)
//   return mainState.hasTag('topbar') ? <Topbar /> : null
// }
