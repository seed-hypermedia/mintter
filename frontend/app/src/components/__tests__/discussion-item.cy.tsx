it('Discussion Item', () => {
  /**
   * - visual checks
   *   - it should render author alias
   *   - it should render the create date
   *   - it should render the content
   * - interaction checks
   *   - when click, should navigate to the document
   *   - when highlight, it should not follow the click
   *
   */
})

// import {App} from '@app/app'
// import {Link, Publication} from '@app/client'
// import {blockToApi} from '@app/client/v2/block-to-api'
// import {queryKeys} from '@app/hooks'
// import {mountProviders} from '@app/test/utils'
// import {embed, FlowContent, paragraph, statement, text} from '@app/mttast'

// describe('<DiscussionItem />', () => {
//   let p1b1: FlowContent = statement({id: 'p1b1'}, [
//     paragraph([text('block p1b1')]),
//   ])

//   let p1 = {
//     version: 'v1',
//     document: {
//       id: 'p1',
//       title: 'pub 1',
//       subtitle: '',
//       author: 'a1',
//       publishTime: undefined,
//       createTime: new Date(),
//       updateTime: new Date(),
//       children: [
//         {
//           block: blockToApi(p1b1),
//           children: [],
//         },
//       ],
//     },
//   }

//   let p2b1: FlowContent = statement({id: 'p2b1'}, [
//     paragraph([
//       text('embed of '),
//       embed({url: 'mtt://p1/v1/b1'}, [text('')]),
//       text(' from p2b1'),
//     ]),
//   ])

//   let p2: Publication = {
//     version: 'v1',
//     document: {
//       id: 'p2',
//       title: 'pub 1',
//       subtitle: '',
//       author: 'a1',
//       publishTime: undefined,
//       createTime: new Date(),
//       updateTime: new Date(),
//       children: [
//         {
//           block: blockToApi(p2b1),
//           children: [],
//         },
//       ],
//     },
//   }

//   let p3b1: FlowContent = statement({id: 'p2b1'}, [
//     paragraph([
//       text('embed of '),
//       embed({url: 'mtt://p1/v1/b1'}, [text('')]),
//       text(' from p3b1'),
//     ]),
//   ])

//   let p3: Publication = {
//     version: 'v1',
//     document: {
//       id: 'p3',
//       title: 'pub 1',
//       subtitle: '',
//       author: 'a1',
//       publishTime: undefined,
//       createTime: new Date(),
//       updateTime: new Date(),
//       children: [
//         {
//           block: blockToApi(p3b1),
//           children: [],
//         },
//       ],
//     },
//   }

//   let links: Array<Link> = [
//     {
//       source: {
//         documentId: p2.document?.id ?? '',
//         version: p2.version,
//         blockId: p2b1.id,
//       },
//       target: {
//         documentId: p1.document.id,
//         version: p1.version,
//         blockId: p1b1.id,
//       },
//     },
//     {
//       source: {
//         documentId: p3.document?.id ?? '',
//         version: p3.version,
//         blockId: p3b1.id,
//       },
//       target: {
//         documentId: p1.document.id,
//         version: p1.version,
//         blockId: p1b1.id,
//       },
//     },
//   ]

//   it('should render', () => {
//     let {render, client} = mountProviders({
//       publication: p1,
//       publicationList: [p1, p2, p3],
//       initialRoute: `/p/${p1.document.id}/${p1.version}`,
//     })

//     client.setQueryData<Array<Link>>(
//       [queryKeys.GET_PUBLICATION_DISCUSSION, p1.document.id, p1.version],
//       links,
//     )

//     render(<App />)
//   })
// })
