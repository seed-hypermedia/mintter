import {queryKeys} from '@app/hooks'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryResult,
} from '@tanstack/react-query'
import {Store} from 'tauri-plugin-store-api'
import {RelayPool} from 'nostr-relaypool'
import {Event, NostrToolsEvent} from 'nostr-relaypool/event'
import {getPublicKey, Kind} from 'nostr-tools'
import * as secp256k1 from '@noble/secp256k1'
import {decode as bech32decode, encode as bech32encode} from 'bech32-buffer'
import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {EXPERIMENTS} from './experimental'
import {useEffect, useState} from 'react'

const nostrStore = new Store('.nostr.dat')

const DefaultRelayList = [
  'wss://relay.damus.io',
  'wss://nostr.fmt.wiz.biz',
  'wss://nostr.bongbong.com',
]

async function getRelayList(): Promise<string[]> {
  const saved = await nostrStore.get('RelayList')
  if (!saved) return DefaultRelayList
  return saved as string[]
}

async function getKeyPair(): Promise<null | {sec: string; pub: string}> {
  const saved = await nostrStore.get('KeyPair')
  if (!saved) return DefaultNostrKeypair
  return saved as {sec: string; pub: string}
}
type KeyPair = {sec: string; pub: string}
export function useSetKeyPair(
  opts: UseMutationOptions<KeyPair, unknown, string>,
) {
  return useMutation(
    async (privateKey: string) => {
      const pub = privKeyToPubKey(privateKey)
      const keyPair = {sec: privateKey, pub}
      await nostrStore.set('KeyPair', keyPair)
      return keyPair
    },
    {
      ...opts,
      onSuccess: (resultKeyPair) => {
        appQueryClient.setQueriesData(['nostr', 'keyPair'], resultKeyPair)
      },
    },
  )
}

const defaultNostrPrivKey =
  'nsec15llnsl2rdny36urh0u3nh5kwdq5vax0n8slxy2m02l9qyz230ens6kaz08'
const DefaultNostrKeypair = {
  sec: defaultNostrPrivKey,
  pub: privKeyToPubKey(defaultNostrPrivKey),
}

export function useNostrKeypair() {
  return useQuery({
    queryKey: ['nostr', 'keyPair'],
    queryFn: getKeyPair,
  })
}

export function useNostrRelayList() {
  return useQuery({
    queryKey: ['nostr', 'relayList'],
    queryFn: getRelayList,
  })
}

async function getStorePostIndex(docId: string): Promise<string[]> {
  const saved = await nostrStore.get(`DocPostIndex:${docId}`)
  if (!saved) return []
  return saved as string[]
}

export type NostrUserProfile = {
  name: string
  display_name: string
  about: string
  lud06: string
  website: string
  picture: string
}

async function getUserProfile(
  pubkey: string,
): Promise<NostrUserProfile | null> {
  const saved = await nostrStore.get(`UserProfile:${pubkey}`)
  if (!saved) return null

  return saved as NostrUserProfile
}

async function getPostReplyIndex(postId: string): Promise<string[]> {
  const saved = await nostrStore.get(`PostReplyIndex:${postId}`)
  if (!saved) return []
  return saved as string[]
}

function usePromise<Result>(promise: Promise<Result>): undefined | Result {
  const [result, setResult] = useState<undefined | Result>(undefined)
  useEffect(() => {
    if (!promise) return
    promise.then(setResult)
  }, [promise])
  return result
}

export function useNostr() {
  return usePromise(getNostr())
}

export function useNostrReplies(postId: string) {
  const nostr = useNostr()
  useEffect(
    () =>
      nostr?.relayPool.subscribe(
        [
          {
            kinds: [Kind.Text],
            '#e': [
              // eg '967e4ad860ba1151cea7811b9703c88f84f340642e292ee8abae24b44c2b6c6e',
              postId,
            ],
          },
        ],
        nostr.relays,
        (event, isAfterEose, relayURL) => {
          ackEvent(event)
          // console.log('Reply Evt', {postId, event, isAfterEose, relayURL})
        },
        undefined,
        (events, relayURL) => {
          // console.log('Reply relay events', events, relayURL)
        },
      ),
    [postId, nostr],
  )

  return useQuery({
    queryKey: ['nostr', 'post-replies', postId],
    queryFn: async () => {
      if (!nostr) return []
      const postIds = await getPostReplyIndex(postId)
      return await Promise.all(
        (postIds || []).map(async (postId: string) => {
          const post = await nostrStore.get(`Post:${postId}`)
          return post as Event
        }),
      )
    },
    enabled: !!nostr && EXPERIMENTS.nostr,
  })
}

export function useNostrPostsOnDoc(
  docId: string | undefined,
): UseQueryResult<Event[]> {
  useNostr()
  return useQuery({
    queryKey: ['nostr', 'doc-posts', docId],
    enabled: !!docId && EXPERIMENTS.nostr,
    queryFn: async () => {
      if (!docId) return []
      const postIds = await getStorePostIndex(docId)
      return await Promise.all(
        (postIds || []).map(async (postId: string) => {
          const post = await nostrStore.get(`Post:${postId}`)
          return post
        }),
      )
    },
  })
}
export function useNostrPublishProfile() {
  const nostr = useNostr()
  return useMutation(
    async (profile: NostrUserProfile) => {
      if (!nostr) throw new Error('nostr not ready')
      await nostr.publish(JSON.stringify(profile), [], Kind.Metadata)
    },
    {
      onSuccess: () => {
        const pubkey = nostr?.getPublicKey()
        if (pubkey) appInvalidateQueries(['nostr', 'userProfile', pubkey])
      },
    },
  )
}

export function useMyNostrProfile() {
  const nostr = useNostr()
  const pubkey = nostr?.getPublicKey()
  return useNostrProfile(pubkey)
}

export function useNostrProfile(pubkey?: string | null) {
  const nostr = useNostr()
  useEffect(() => {
    if (!pubkey) return
    nostr?.relayPool.subscribe(
      [
        {
          kinds: [Kind.Metadata],
          authors: [pubkey],
        },
      ],
      nostr.relays,
      (event, isAfterEose, relayURL) => {
        const profile = JSON.parse(event.content)
        nostrStore.set(`UserProfile:${pubkey}`, profile).catch((e) => {
          console.error('Error saving user metadata', e)
        })
        appQueryClient.setQueryData(['nostr', 'userProfile', pubkey], profile)
      },
      undefined,
      (events, relayURL) => {
        // console.log('Reply relay events', events, relayURL)
      },
    )
  }, [pubkey, nostr])

  return useQuery({
    queryKey: ['nostr', 'userProfile', pubkey],
    enabled: !!pubkey,
    queryFn: async () => {
      const info = await getUserProfile(pubkey)
      return info
    },
  })
}

export function useAddRelay(opts?: UseMutationOptions<void, Error, string>) {
  return useMutation(
    async (relay: string) => {
      if (!relay.startsWith('wss://')) throw new Error('Invalid URL provided')
      const relays = await getRelayList()
      await nostrStore.set('RelayList', [...relays, relay])
    },
    {
      ...opts,
      onSuccess: (...args) => {
        appInvalidateQueries(['nostr', 'relayList'])
        opts?.onSuccess?.(...args)
      },
    },
  )
}

export function hexToArrayBuffer(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))
}

export function arrayBufferToHex(b: Uint8Array): string {
  const arrayValues = Array.from(new Uint8Array(b))
  const hex = arrayValues.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex
}

export function privKeyToPubKey(privKey: string): string {
  const hexPubKey = getPublicKey(arrayBufferToHex(bech32decode(privKey).data))
  const pubId = bech32encode('npub', hexToArrayBuffer(hexPubKey))
  return pubId
}
async function ingestTextEvent(event: Event) {
  const contentURLs = event.content.match(/https?:\/\/\S+/g)
  // todo, check for canonical urls by hitting this url and getting the doc id from a special header
  const referencedDocs = contentURLs
    ?.map((url) => {
      const match = url.match(/https?:\/\/mintter.com\/p\/(.*)\/(.*)/)
      return match?.[1] || false
    })
    .filter(Boolean) as string[]
  const referencedNotes: string[] = []
  event.tags.forEach((tagTuple) => {
    if (tagTuple[0] !== 'e') return
    referencedNotes.push(tagTuple[1])
  })
  const shouldSave = !!referencedDocs?.length || !!referencedNotes?.length
  if (shouldSave) {
    if (!(await nostrStore.has(`Post:${event.id}`))) {
      console.log('saving post ', event.id)
      await nostrStore.set(`Post:${event.id}`, event)
    }
  }

  if (referencedNotes?.length) {
    await Promise.all(
      referencedNotes.map(async (noteId) => {
        const prevIndex = await getPostReplyIndex(noteId)
        if (prevIndex.indexOf(event.id) === -1) {
          await nostrStore.set(`PostReplyIndex:${noteId}`, [
            ...prevIndex,
            event.id,
          ])
          appQueryClient.setQueryData(
            ['nostr', 'post-replies', noteId],
            (prevIndex: Event[] | undefined) => {
              if (!prevIndex) return [event]
              if (prevIndex.find((e) => e.id === event.id)) return prevIndex
              return [...prevIndex, event]
            },
          )
        }
      }),
    )
  }
  if (referencedDocs?.length) {
    await Promise.all(
      referencedDocs.map(async (docId) => {
        const prevIndex = await getStorePostIndex(docId)
        if (prevIndex.indexOf(event.id) === -1) {
          await nostrStore.set(`DocPostIndex:${docId}`, [
            ...prevIndex,
            event.id,
          ])
          appQueryClient.setQueryData(
            ['nostr', 'doc-posts', docId],
            (prevIndex: Event[] | undefined) => {
              if (!prevIndex) return [event]
              if (prevIndex.find((e) => e.id === event.id)) return prevIndex
              return [...prevIndex, event]
            },
          )
        }
      }),
    )
  }
}

function ackEvent(event: Event) {
  if (event.kind === Kind.Text) {
    ingestTextEvent(event).catch((e) =>
      console.error('Failed to ingest event', e),
    )
  }
}

export function useRemoveRelay(
  opts?: UseMutationOptions<void, string, unknown>,
) {
  return useMutation(
    async (relay: string) => {
      const relays = await getRelayList()
      await nostrStore.set(
        'RelayList',
        [...relays].filter((r) => r !== relay),
      )
    },
    {
      ...opts,
      onSuccess: (...args) => {
        appInvalidateQueries(['nostr', 'relayList'])
        opts?.onSuccess?.(...args)
      },
    },
  )
}

async function startNostr() {
  const relays = await getRelayList()
  // const {} = await getKeyPair()

  const relayPool = new RelayPool(relays)

  relayPool.onerror((err, relayUrl) => {
    console.log('RelayPool error', err, ' from relay ', relayUrl)
  })
  relayPool.onnotice((relayUrl, notice) => {
    console.log('RelayPool notice', notice, ' from relay ', relayUrl)
  })

  const nostrPubKey =
    // '2a93e75b56ecd9a27cd18abc67f7ee7429afe51136226de59871879c921dc2a4'
    '71bd96ecb5539984ea8ff247919f7434829fb310f73f42810d47805166f36508'
  // 'npub192f7wk6kanv6ylx3327x0alwws56leg3xc3xmevcwxreeysac2jqyq0j7a'
  const nostrSecKey =
    // 'nsec15llnsl2rdny36urh0u3nh5kwdq5vax0n8slxy2m02l9qyz230ens6kaz08'
    'nsec1c7rv0y28w8hk7tzzslrf672pq5c6fzmhgvn9l825wt9zelq9qksq3mgz28'

  async function publish(
    content: string,
    tags: string[][] = [],
    kind: Kind = Kind.Text,
  ) {
    const nostrSecKeyDecoded = bech32decode(nostrSecKey)
    const nostrPubKeyDecoded = bech32decode(
      // 'npub192f7wk6kanv6ylx3327x0alwws56leg3xc3xmevcwxreeysac2jqyq0j7a',
      'npub1wx7edm942wvcf6507frer8m5xjpflvcs7ul59qgdg7q9zehnv5yqscs6ak',
    )
    const createdAtTime = Math.floor(Date.now() / 1000)
    // create the id per the spec
    const pubkeyLol = Buffer.from(nostrPubKeyDecoded.data).toString('hex')
    // not sure what format we should store the keys in, this is kind of a mess..
    const digestableEvtData = JSON.stringify([
      0,
      //<pubkey, as a (lowercase) hex string>,
      nostrPubKey,
      //  <created_at, as a number>,   //  timestamp in seconds:
      createdAtTime,
      // kind number, text post:
      kind,
      // <tags, as an array of arrays of non-null strings>,
      tags,
      content,
      // <content, as a string>
    ])
    const idBuffer = await crypto.subtle.digest(
      'SHA-256',
      Buffer.from(digestableEvtData),
    )
    // thx https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
    const idHashArray = Array.from(new Uint8Array(idBuffer))
    const id = idHashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    const sig = secp256k1.utils.bytesToHex(
      secp256k1.schnorr.signSync(id, nostrSecKeyDecoded.data),
    )
    const event: NostrToolsEvent = {
      id,
      kind,
      created_at: createdAtTime,
      tags,
      pubkey: nostrPubKey,
      content,
      sig,
    }
    relayPool.publish(event, relays)
  }

  const close = relayPool.subscribe(
    [
      {
        authors: [nostrPubKey],
      },
    ],
    relays,
    (event, isAfterEose, relayURL) => {
      ackEvent(event)
      // console.log('Evt', event, isAfterEose, relayURL)
    },
    undefined,
    (events, relayURL) => {
      // console.log('Relay events', events, relayURL)
    },
  )
  function getPublicKey(): string {
    return nostrPubKey
  }
  return {close, relays, relayPool, publish, getPublicKey}
}
type Nostr = Awaited<ReturnType<typeof startNostr>>
let nostr: Nostr | undefined = undefined

let startingNostr: undefined | Promise<Nostr> = undefined
async function getNostr(): Promise<Nostr> {
  if (nostr) return nostr
  if (startingNostr) return await startingNostr
  startingNostr = startNostr()
  return await startingNostr
}
