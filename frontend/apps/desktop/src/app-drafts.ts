import fs from 'fs/promises'
import {join} from 'path'
import z from 'zod'
import {userDataPath} from './app-paths'
import {t} from './app-trpc'

const draftsDir = join(userDataPath, 'data', 'drafts')

let draftIdList: string[] | undefined = undefined

async function initDrafts() {
  await fs.mkdir(draftsDir, {recursive: true})
  await fs.readdir(draftsDir)
  const allDraftFiles = await fs.readdir(draftsDir)
  const allDraftIds = allDraftFiles.map(draftFileNameToId)
  draftIdList = allDraftIds
}

initDrafts()
  .then(() => {
    console.log('[MAIN]: drafts ready')
  })
  .catch((e) => {
    console.error('[MAIN]: error preparing drafts', e)
  })

function inputIdToDraftFile(id: string) {
  const encodedId = Buffer.from(id).toString('base64')
  console.log('=== encodedId', encodedId)
  return `${encodedId}.json`
}

function draftFileNameToId(filename: string) {
  const baseName = filename.replace(/\.json$/, '')
  const id = Buffer.from(baseName, 'base64').toString('utf-8')
  return id
}

export const draftsApi = t.router({
  list: t.procedure.query(async () => {
    return draftIdList
  }),
  get: t.procedure.input(z.string()).query(async ({input}) => {
    const draftPath = join(draftsDir, inputIdToDraftFile(input))
    try {
      const fileContent = await fs.readFile(draftPath, 'utf-8')
      const draft = JSON.parse(fileContent)

      return draft
    } catch (e) {
      console.log(
        `[DRAFT]: Error when getting draft ${input}: ${JSON.stringify(e)}`,
      )
      return null
    }
  }),
  write: t.procedure
    .input(
      z.object({
        draft: z.any(), // TODO: zod for draft object?
        id: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      const draftPath = join(draftsDir, inputIdToDraftFile(input.id))
      if (!draftIdList?.includes(input.id)) {
        draftIdList?.push(input.id)
      }
      try {
        await fs.writeFile(draftPath, JSON.stringify(input.draft, null, 2))
        return input
      } catch (error) {
        throw Error(
          `[DRAFT]: Error writinf draft: ${JSON.stringify(error, null)}`,
        )
      }
    }),
  delete: t.procedure.input(z.string()).mutation(async ({input}) => {
    const draftPath = join(draftsDir, `${input}.json`)
    draftIdList = draftIdList?.filter((id) => id !== input)
    await fs.unlink(draftPath)
  }),
})
