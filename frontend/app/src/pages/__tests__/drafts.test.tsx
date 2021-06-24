import {screen, render, waitFor} from '../../test/app-test-utils'
import {renderLibrary} from '../../test/render-library'
import {Drafts} from '../drafts'

describe('<Drafts />', () => {
  test('should render drafts', async () => {
    const {drafts} = await renderLibrary(<Drafts />, {
      router: {initialEntries: [{pathname: '/library/drafts'}]},
      wait: true,
    })
    // const doc1 = drafts[0]
    // console.log('🚀 ~ file: drafts.test.tsx ~ line 12 ~ test ~ doc1', doc1)
    await waitFor(() => {
      // expect(screen.getByText(doc1.title)).toBeInTheDocument()
      screen.debug()
    })

    // expect(screen.queryByText(/Start your first document/i)).not.toBeInTheDocument()
  })
})
