import {groupsVariantsMatch, stringArrayMatch} from '@mintter/shared'
import z from 'zod'
import {appStore} from './app-store'
import {t} from './app-trpc'

const PINS_STORAGE_KEY = 'Pins-v003'

type PinsState = {
  accounts: string[]
  documents: {
    docId: string
    authors: string[]
    groups?: {groupId: string; pathName: string | null}[]
  }[]
  groups: {
    groupId: string
    documents: {pathName?: string}[]
  }[]
}

let pins: PinsState = (appStore.get(PINS_STORAGE_KEY) as PinsState) || {
  accounts: [],
  documents: [],
  groups: [],
}

async function writePins(newPins: PinsState) {
  pins = newPins
  appStore.set(PINS_STORAGE_KEY, newPins)
  return undefined
}

export const pinsApi = t.router({
  get: t.procedure.query(async () => {
    return pins
  }),
  addAccount: t.procedure.input(z.string()).mutation(async ({input}) => {
    await writePins({
      ...pins,
      accounts: [...pins.accounts.filter((pin) => pin !== input), input],
    })
    return undefined
  }),
  removeAccount: t.procedure.input(z.string()).mutation(async ({input}) => {
    await writePins({
      ...pins,
      accounts: pins.accounts.filter((pin) => pin !== input),
    })
    return undefined
  }),
  addGroup: t.procedure.input(z.string()).mutation(async ({input}) => {
    const previousGroup = pins.groups.find((group) => group.groupId === input)
    const groups = previousGroup
      ? pins.groups
      : [...pins.groups, {groupId: input, documents: []}]
    await writePins({
      ...pins,
      groups,
    })
    return undefined
  }),
  removeGroup: t.procedure.input(z.string()).mutation(async ({input}) => {
    await writePins({
      ...pins,
      groups: pins.groups.filter((pin) => pin.groupId !== input),
    })
    return undefined
  }),
  addGroupDocument: t.procedure
    .input(
      z.object({
        groupId: z.string(),
        pathName: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      const prevGroup = pins.groups.find(
        (group) => input.groupId === group.groupId,
      )
      let updatedGroup = prevGroup || {groupId: input.groupId, documents: []}
      const prevPinnedDoc = updatedGroup.documents.find(
        (pin) => pin.pathName === input.pathName,
      )
      if (!prevPinnedDoc) {
        updatedGroup = {
          ...updatedGroup,
          documents: [...updatedGroup.documents, {pathName: input.pathName}],
        }
      }
      if (prevGroup) {
        await writePins({
          ...pins,
          groups: pins.groups.map((group) => {
            if (group.groupId === input.groupId) return updatedGroup
            return group
          }),
        })
      } else if (updatedGroup) {
        await writePins({...pins, groups: [...pins.groups, updatedGroup]})
      }
    }),
  addDocument: t.procedure
    .input(
      z.object({
        docId: z.string(),
        authors: z.array(z.string()),
        groups: z.array(
          z.object({
            groupId: z.string(),
            pathName: z.string().nullable(),
          }),
        ),
      }),
    )
    .mutation(async ({input}) => {
      const prevDoc = pins.documents.find(
        (doc) =>
          doc.docId === input.docId &&
          stringArrayMatch(doc.authors, input.authors) &&
          groupsVariantsMatch(doc.groups, input.groups),
      )
      if (!prevDoc) {
        await writePins({
          ...pins,
          documents: [
            ...pins.documents,
            {docId: input.docId, authors: input.authors, groups: input.groups},
          ],
        })
      }
    }),
  removeGroupDocument: t.procedure
    .input(
      z.object({
        groupId: z.string(),
        pathName: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      await writePins({
        ...pins,
        groups: pins.groups.map((groupPins) => {
          if (groupPins.groupId !== input.groupId) return groupPins
          return {
            ...groupPins,
            documents: groupPins.documents.filter(
              (p) => p.pathName !== input.pathName,
            ),
          }
        }),
      })
    }),
  removeDocument: t.procedure
    .input(
      z.object({
        docId: z.string(),
        authors: z.array(z.string()),
        groups: z.array(
          z.object({
            groupId: z.string(),
            pathName: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({input}) => {
      await writePins({
        ...pins,
        documents: pins.documents.filter(
          (doc) =>
            doc.docId !== input.docId ||
            !stringArrayMatch(doc.authors, input.authors) ||
            !groupsVariantsMatch(doc.groups, input.groups),
        ),
      })
    }),
})
