import {createContext, useContext, useMemo, useCallback} from 'react'
import * as apiClient from './mintterClient'

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  allPublications: (d: any) => Promise<string>
  searchPublicationById: (id: string) => any
  connectToPeerById: (peerIds: string[]) => any
}

const MintterClientContext = createContext<MintterClient>(null)

export function MintterProvider(props) {
  const allPublications = useCallback(
    form =>
      apiClient.allPublications(form).then(res => {
        console.log('ress => ', res)
        return res
      }),
    [],
  )

  const searchPublicationById = useCallback(
    // id => apiClient.searchPublicationById(id).then(res => res.toObject()),
    id => apiClient.searchPublicationById(id),
    [],
  )

  const connectToPeerById = useCallback(
    peerId =>
      apiClient.connectToPeerById(peerId).catch(err => console.error(err)),
    [],
  )

  const value = useMemo(
    () => ({allPublications, searchPublicationById, connectToPeerById}),
    [allPublications, searchPublicationById, connectToPeerById],
  )

  return <MintterClientContext.Provider value={value} {...props} />
}

export function useMintter() {
  const context = useContext(MintterClientContext)

  if (context === undefined) {
    throw new Error(`useMintter must be used within a MintterProvider`)
  }

  return context
}
