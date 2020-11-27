import {
  render,
  screen,
  within,
  userEvent,
  waitFor,
  waitForElementToBeRemoved,
} from 'test/app-test-utils'
import * as clientMock from 'shared/mintterClient'
import {App} from 'shared/app'
import {Profile, SuggestedProfile} from '@mintter/api/v2/mintter_pb'
import {
  buildUser,
  buildSuggestedConnection,
  buildAddrsList,
} from 'test/generate'
// import {Profile} from '@mintter/api/v2/mintter_pb'

jest.mock('shared/mintterClient')

beforeEach(() => {
  jest.clearAllMocks()
})

async function renderLibrary({
  user,
  connections,
  suggestedConnections,
}: {
  user: Partial<Profile.AsObject>
  connections: Profile.AsObject[]
  suggestedConnections: SuggestedProfile.AsObject[]
} = {}) {
  if (user === undefined) {
    user = buildUser()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => user,
  })

  if (connections === undefined) {
    connections = [buildUser(), buildUser(), buildUser()]
  }

  clientMock.listConnections.mockResolvedValueOnce({
    toObject: (): {profilesList: Profile.AsObject[]} => ({
      profilesList: connections,
    }),
  })

  if (suggestedConnections === undefined) {
    suggestedConnections = [
      buildSuggestedConnection(),
      buildSuggestedConnection(),
      buildSuggestedConnection(),
    ]
  }

  clientMock.listSuggestedConnections.mockResolvedValueOnce({
    toObject: (): {profilesList: SuggestedProfile.AsObject[]} => ({
      profilesList: suggestedConnections,
    }),
  })

  const route = '/library/feed'

  const utils = await render(<App />, {route, user})

  return {
    ...utils,
    user,
    connections,
    suggestedConnections,
  }
}

beforeEach(() => {
  clientMock.listDocuments.mockResolvedValue({
    toObject: () => ({
      documentsList: [],
    }),
  })
})

test('render <Connections /> empty message', async () => {
  await renderLibrary({connections: []})

  expect(screen.getByText(/no connections available :\(/i)).toBeInTheDocument()
})

test('render <SuggestedConnections /> empty message', async () => {
  await renderLibrary({suggestedConnections: []})

  expect(screen.getByText(/no suggestions available :\(/i)).toBeInTheDocument()
})

test('<Connections /> and <SuggestedConnections />', async () => {
  const {connections, suggestedConnections} = await renderLibrary()

  const connectionsList = screen.getByRole('list', {
    name: 'connections',
  })

  const list1 = within(connectionsList)
  const items1 = list1.getAllByRole('listitem')
  expect(items1.length).toBe(connections.length)

  expect(
    screen.getByText(connections[0].username, {exact: false}),
  ).toBeInTheDocument()

  const suggestedConnectionsList = screen.getByRole('list', {
    name: 'suggested connections',
  })

  const list2 = within(suggestedConnectionsList)
  const items2 = list2.getAllByRole('listitem')
  expect(items2.length).toBe(suggestedConnections.length)

  expect(
    screen.getByText(suggestedConnections[0].profile.username, {exact: false}),
  ).toBeInTheDocument()
})

test('<Connections /> Connect to Peer', async () => {
  clientMock.connectToPeerById = jest.fn().mockResolvedValue(() => true)
  global.prompt = jest.fn().mockImplementation(() => buildAddrsList().join(','))

  const {connections} = await renderLibrary()
  expect(clientMock.listConnections).toBeCalledTimes(1)

  clientMock.listConnections.mockResolvedValueOnce({
    toObject: (): {profilesList: Profile.AsObject[]} => ({
      profilesList: [...connections, buildUser()],
    }),
  })
  userEvent.click(screen.getByText(/add connection/i))

  await waitForElementToBeRemoved(() => [
    ...screen.queryAllByText(/Connecting to peer/i),
  ])

  expect(
    screen.queryByText(/Connection established successfuly/i),
  ).toBeInTheDocument()

  expect(clientMock.listConnections).toBeCalledTimes(2)

  const connectionsList = screen.getByRole('list', {
    name: 'connections',
  })

  const list = within(connectionsList)
  const items = list.getAllByRole('listitem')
  expect(items.length).toBe(4)
})

test('<SuggestedConnections /> Connect to Peer', async () => {
  await renderLibrary()
})
