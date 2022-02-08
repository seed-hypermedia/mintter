import {store} from './store'

const LIST_SIDEPANEL = 'listSidepanel'

export type SidepanelItem = {
  type: 'block' | 'publication' | undefined
  url: string
}

export type ListSidepanelResponse = {
  items: Array<SidepanelItem>
}

export async function listSidepanel(): Promise<ListSidepanelResponse> {
  let items = (await store.get<Array<SidepanelItem>>(LIST_SIDEPANEL)) || []
  return {items}
}

export function updateListSidepanel(list: Array<SidepanelItem>) {
  return store.set(LIST_SIDEPANEL, list)
}
