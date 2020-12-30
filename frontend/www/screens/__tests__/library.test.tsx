import {
  render,
  screen,
  within,
  userEvent,
  waitFor,
  waitForElementToBeRemoved,
} from 'test/app-test-utils'
import * as clientMock from 'shared/mintter-client'
import {App} from 'shared/app'
import {Profile, SuggestedProfile} from '@mintter/api/v2/mintter_pb'
import {
  buildProfile,
  buildSuggestedConnection,
  buildAddrsList,
} from 'test/generate'
// import {Profile} from '@mintter/api/v2/mintter_pb'

jest.mock('shared/mintterClient')

beforeEach(() => {
  jest.clearAllMocks()
})

async function renderLibrary({
  profile,
  connections,
  suggestedConnections,
}: {
  profile: Partial<Profile.AsObject>
  connections: Profile.AsObject[]
  suggestedConnections: SuggestedProfile.AsObject[]
} = {}) {
  if (profile === undefined) {
    profile = buildProfile()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => profile,
  })

  if (connections === undefined) {
    connections = [buildProfile(), buildProfile(), buildProfile()]
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

  const utils = await render(<App />, {route, profile})

  return {
    ...utils,
    profile,
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
  const addrs = buildAddrsList()
  global.prompt = jest.fn().mockImplementation(() => addrs.join(','))

  const {connections} = await renderLibrary()

  expect(clientMock.listConnections).toBeCalledTimes(1)

  // mock of connection after adding one
  clientMock.listConnections.mockResolvedValueOnce({
    toObject: (): {profilesList: Profile.AsObject[]} => ({
      profilesList: [...connections, buildProfile()],
    }),
  })

  // click on add connection button that opens prompt (mocked)
  userEvent.click(screen.getByText(/add connection/i))

  // toast after calling the `connectToPeerById` method
  await waitForElementToBeRemoved(() => [
    ...screen.queryAllByText(/Connecting to peer/i),
  ])

  // check that the `connectToPeerById` is called with the correct addresses
  expect(clientMock.connectToPeerById).toBeCalledWith(addrs)

  // toast complete in the screen
  expect(
    screen.queryByText(/Connection established successfuly/i),
  ).toBeInTheDocument()

  // refetch the connections is called after new connection is stablished
  expect(clientMock.listConnections).toBeCalledTimes(2)

  const connectionsList = screen.getByRole('list', {
    name: 'connections',
  })

  const list = within(connectionsList)
  const items = list.getAllByRole('listitem')
  // new connections shows in the list
  expect(items.length).toBe(4)
})

test('<SuggestedConnections /> Connect to Peer', async () => {
  const newConn = buildSuggestedConnection()
  const suggC = [buildSuggestedConnection(), buildSuggestedConnection()]
  clientMock.connectToPeerById = jest.fn().mockResolvedValue(() => true)

  clientMock.listConnections.mockResolvedValue({
    toObject: (): {profilesList: Profile.AsObject[]} => ({
      profilesList: [newConn.profile],
    }),
  })

  clientMock.listSuggestedConnections.mockResolvedValue({
    toObject: (): {profilesList: SuggestedProfile.AsObject[]} => ({
      profilesList: suggC,
    }),
  })
  const {suggestedConnections} = await renderLibrary({
    connections: [],
    suggestedConnections: [newConn, ...suggC],
  })

  expect(clientMock.listConnections).toBeCalledTimes(1)

  const suggestedConnectionsList = screen.getByRole('list', {
    name: 'suggested connections',
  })

  const list = within(suggestedConnectionsList)
  const items = list.getAllByRole('listitem')
  expect(items.length).toBe(suggestedConnections.length)

  // get the first suggested connection
  const connection = suggestedConnections[0]

  // click on first suggested connection item "connect" button
  const itemUtils = within(items[0])
  const firstButton = itemUtils.getByText(/connect/i)
  userEvent.click(firstButton)

  // toast after calling the `connectToPeerById` method
  await waitForElementToBeRemoved(() => [
    ...screen.queryAllByText(/Connecting to peer/i),
  ])

  // toast complete in the screen
  expect(
    screen.queryByText(/Connection established successfuly/i),
  ).toBeInTheDocument()

  // called just once
  expect(clientMock.connectToPeerById).toBeCalledTimes(1)

  // called with the first profile addresses
  expect(clientMock.connectToPeerById).toBeCalledWith(connection.addrsList)

  // refetch the connections is called after new connection is stablished
  expect(clientMock.listConnections).toBeCalledTimes(2)

  // connection list is updated
  const connectionsList = screen.getByRole('list', {
    name: 'connections',
  })

  const cList = within(connectionsList)
  const cItems = cList.getAllByRole('listitem')
  // new connections shows in the list
  expect(cItems.length).toBe(1)
  expect(
    cList.getByText(newConn.profile.username, {exact: false}),
  ).toBeInTheDocument()
})
