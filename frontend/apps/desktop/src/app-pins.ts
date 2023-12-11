import z from 'zod'
import {appStore} from './app-store'
import {t} from './app-trpc'

const PINS_STORAGE_KEY = 'Pins-v002'

type PinsState = {
  accounts: string[]
  trustedDocuments: string[]
  allDocuments: string[]
  groups: {
    groupId: string
    documents: {docId: string; pathName?: string}[]
  }[]
}

let pins: PinsState = (appStore.get(PINS_STORAGE_KEY) as PinsState) || {
  accounts: [],
  trustedDocuments: [],
  allDocuments: [],
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
  addDocument: t.procedure
    .input(
      z.object({
        docId: z.string(),
        groupId: z.string().optional(),
        pathName: z.string().optional(),
        isTrusted: z.boolean().optional(),
      }),
    )
    .mutation(async ({input}) => {
      if (input.groupId) {
        let groups = pins.groups
        if (!groups.find((group) => group.groupId === input.groupId)) {
          groups = [
            ...groups,
            {
              groupId: input.groupId,
              documents: [{docId: input.docId, pathName: input.pathName}],
            },
          ]
        } else {
          groups = groups.map((group) => {
            if (group.groupId === input.groupId) {
              return {
                ...group,
                documents: [
                  ...group.documents,
                  {pathName: input.pathName, docId: input.docId},
                ],
              }
            }
            return group
          })
        }
        await writePins({...pins, groups})
      } else if (input.isTrusted) {
        await writePins({
          ...pins,
          trustedDocuments: addToList(pins.trustedDocuments, input.docId),
        })
      } else {
        await writePins({
          ...pins,
          allDocuments: addToList(pins.trustedDocuments, input.docId),
        })
      }
    }),
  removeDocument: t.procedure
    .input(
      z.object({
        docId: z.string(),
        groupId: z.string().optional(),
        pathName: z.string().optional(),
        isTrusted: z.boolean().optional(),
      }),
    )
    .mutation(async ({input}) => {
      if (input.groupId) {
        await writePins({
          ...pins,
          groups: pins.groups.map((group) => {
            if (group.groupId === input.groupId) {
              return {
                ...group,
                documents: group.documents.filter(
                  (pin) =>
                    pin.docId !== input.docId &&
                    pin.pathName !== input.pathName,
                ),
              }
            }
            return group
          }),
        })
      } else if (input.isTrusted) {
        await writePins({
          ...pins,
          trustedDocuments: pins.trustedDocuments.filter(
            (pin) => pin !== input.docId,
          ),
        })
      } else {
        await writePins({
          ...pins,
          allDocuments: pins.allDocuments.filter((pin) => pin !== input.docId),
        })
      }
    }),
})

function addToList(list: string[], item: string) {
  if (list.indexOf(item) !== -1) return list
  return [...list, item]
}
