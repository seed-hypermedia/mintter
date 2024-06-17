import {unpackHmId} from '@shm/shared/src/utils/entity-id-url'
import {appendFile, exists, mkdirp, move, rmdir, writeFile} from 'fs-extra'
import open from 'open'
import {dirname} from 'path'
import {z} from 'zod'
import {userDataPath} from './app-paths'
import {t} from './app-trpc'

function draftFilePath(draftId: string) {
  return `${userDataPath}/DraftLog/Draft_${draftId}.json`
}
function createPubFilePath(docId: string) {
  return `${userDataPath}/DraftLog/Publication_${getFormattedDateTime()}_${docId}.json`
}

function getFormattedDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0') // Months are 0-based in JS, so we add 1.
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  return `${year}.${month}.${day}-${hour}.${minute}.${seconds}`
}

export const diagnosisApi = t.router({
  appendDraftLog: t.procedure
    .input(
      z.object({
        draftId: z.string(),
        event: z.any(),
      }),
    )
    .mutation(async ({input}) => {
      const id = unpackHmId(input.draftId)
      if (!id) throw new Error('Invalid draftId')
      const draftPath = draftFilePath(id.eid)
      // @ts-ignore
      const logExist: boolean = await exists(draftPath)
      if (!logExist) {
        await mkdirp(dirname(draftPath))
        await writeFile(draftPath, '')
      }
      await appendFile(draftPath, JSON.stringify(input.event) + '\n')
    }),
  completeDraftLog: t.procedure
    .input(
      z.object({
        draftId: z.string(),
        event: z.any(),
      }),
    )
    .mutation(async ({input}) => {
      const id = unpackHmId(input.draftId)
      if (!id) throw new Error('Invalid draftId')
      const draftPath = draftFilePath(id.eid)
      await appendFile(draftPath, JSON.stringify(input.event) + '\n')
      const pubFilePath = createPubFilePath(id.eid)
      await move(draftPath, pubFilePath)
      return pubFilePath
    }),
  openDraftLog: t.procedure.input(z.string()).mutation(async ({input}) => {
    const id = unpackHmId(input)
    if (!id) throw new Error('Invalid draftId')
    await open(draftFilePath(id.eid))
  }),
  openDraftLogFolder: t.procedure.mutation(async () => {
    await open(`${userDataPath}/DraftLog`)
  }),
  destroyDraftLogFolder: t.procedure.mutation(async () => {
    await rmdir(`${userDataPath}/DraftLog`, {recursive: true})
  }),
})
