import {NextApiRequest, NextApiResponse} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import svg2img from 'svg2img'
import satori from 'satori'
import {readFileSync} from 'fs'
import {join} from 'path'
import {serverHelpers} from 'server/ssr-helpers'
import {createHmId} from '@mintter/shared'

const robotoBoldPath = join(process.cwd(), 'font/Roboto-Bold.ttf')
const robotoArrayBuffer = readFileSync(robotoBoldPath)
const robotoRegularPath = join(process.cwd(), 'font/Roboto-Regular.ttf')
const robotoRegularArrayBuffer = readFileSync(robotoRegularPath)

const AVATAR_SIZE = 100

const avatarLayout: React.CSSProperties = {
  margin: 10,
}

export default async function mediaHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {entityType, entityId, versionId} = req.query
  if (entityType !== 'd') throw new Error('Only supports Document types')
  if (!entityId) throw new Error('Missing entityId')
  if (!versionId) throw new Error('Missing versionId')
  const helpers = serverHelpers({})
  const documentId = createHmId('d', String(entityId))
  const pub = await helpers.publication.get.fetch({
    documentId,
    versionId: String(versionId),
  })
  if (!pub?.publication?.document) throw new Error('Publication not found')
  const {publication} = pub
  const editors = await Promise.all(
    (publication.document?.editors || []).map(async (editorId) => {
      return helpers.account.get.fetch({accountId: editorId})
    }),
  )
  console.log(pub)
  console.log(editors)
  const svg = await satori(
    <div
      style={{
        color: 'black',
        display: 'flex',
        height: '100%',
        width: '100%',
      }}
    >
      <div style={{padding: 60, display: 'flex'}}>
        <span style={{fontSize: 64, fontWeight: 'bold'}}>
          {publication.document?.title}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 40,
          }}
        >
          {editors.map((editor) => {
            const account = editor.account
            if (!account?.profile?.avatar)
              return (
                <div
                  style={{
                    backgroundColor: '#aac2bd', // mintty, yum!
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: AVATAR_SIZE / 2,
                    ...avatarLayout,
                  }}
                />
              )
            const src = `${process.env.GRPC_HOST}/ipfs/${account.profile.avatar}`
            return (
              /* eslint-disable */
              <img
                key={account.id}
                src={src}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                style={{
                  borderRadius: AVATAR_SIZE / 2,
                  ...avatarLayout,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Roboto',
          data: robotoArrayBuffer,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Roboto',
          data: robotoRegularArrayBuffer,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  )
  const png = await new Promise<Buffer>((resolve, reject) =>
    svg2img(svg, function (error, buffer) {
      if (error) reject(error)
      else resolve(buffer)
    }),
  )
  setAllowAnyHostGetCORS(res)
  res.status(200).setHeader('Content-Type', 'image/png').send(png)
}
