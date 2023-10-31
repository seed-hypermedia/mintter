import {NextApiRequest, NextApiResponse} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import svg2img from 'svg2img'
import satori from 'satori'
import {readFileSync} from 'fs'
import {join} from 'path'
import {serverHelpers} from 'server/ssr-helpers'
import {OG_IMAGE_SIZE} from 'server/content-image-meta'
import {
  HMBlock,
  HMBlockChildrenType,
  HMBlockImage,
  HMBlockNode,
  HMPublication,
  createHmId,
  getCIDFromIPFSUrl,
  toHMInlineContent,
} from '@mintter/shared'

import {ReactElement} from 'react'
import {InlineContent} from '@mintter/editor'
import {HMAccount, HMGroup} from '@mintter/shared/src/json-hm'

function loadFont(fileName: string) {
  const path = join(process.cwd(), 'font', fileName)
  return readFileSync(path)
}

const AVATAR_SIZE = 100
const IPFS_RESOURCE_PREFIX = `${process.env.GRPC_HOST}/ipfs/`

const avatarLayout: React.CSSProperties = {
  margin: 10,
}

function InlineContent({
  content,
  fontWeight = 'normal',
  fontSize = 24,
}: {
  content: InlineContent[]
  fontWeight?: 'bold' | 'normal'
  fontSize?: number
}) {
  return (
    <span style={{fontSize: 32}}>
      {content.map((item, index) => {
        if (item.type === 'link')
          return (
            <span key={index} style={{color: '#000055', marginLeft: 4}}>
              <InlineContent content={item.content} />
            </span>
          )
        if (item.type === 'text') {
          let content: ReactElement = <>{item.text}</>
          if (item.styles.bold) content = <b>{content}</b>
          if (item.styles.italic) content = <i>{content}</i>
          return content
        }
        return
      })}
    </span>
  )
}

function ParagraphBlockDisplay({
  block,
  childrenType,
}: {
  block: HMBlock
  childrenType: HMBlockChildrenType
}) {
  const inlineContent = toHMInlineContent(block)
  return (
    <div
      style={{
        display: 'flex',
        marginTop: 8,
      }}
    >
      <InlineContent content={inlineContent} fontSize={24} />
    </div>
  )
}

function HeadingBlockDisplay({
  block,
  childrenType,
}: {
  block: HMBlock
  childrenType: HMBlockChildrenType
}) {
  const inlineContent = toHMInlineContent(block)
  return (
    <div
      style={{
        display: 'flex',
        marginTop: 8,
      }}
    >
      <InlineContent content={inlineContent} fontSize={64} fontWeight="bold" />
    </div>
  )
}
function ImageBlockDisplay({block}: {block: HMBlockImage}) {
  return (
    <img
      style={{borderRadius: 8}}
      src={`${IPFS_RESOURCE_PREFIX}${getCIDFromIPFSUrl(block.ref)}`}
    />
  )
}
function BlockDisplay({
  block,
  childrenType,
}: {
  block: HMBlock
  childrenType: HMBlockChildrenType
}) {
  if (block.type === 'paragraph')
    return <ParagraphBlockDisplay block={block} childrenType={childrenType} />
  if (block.type === 'heading')
    return <HeadingBlockDisplay block={block} childrenType={childrenType} />

  if (block.type === 'image') return <ImageBlockDisplay block={block} />

  return null
}

function BlockNodeDisplay({
  index,
  blockNode,
}: {
  index: number
  blockNode: HMBlockNode
}) {
  return (
    <div style={{display: 'flex', marginBottom: 20}}>
      {blockNode.block && (
        <BlockDisplay
          block={blockNode.block}
          childrenType={blockNode.block.attributes?.childrenType}
        />
      )}
      <div style={{display: 'flex', marginLeft: 20, flexDirection: 'column'}}>
        {blockNode.children?.map((child, index) => {
          if (!child.block) return null
          return (
            <BlockNodeDisplay
              index={index}
              key={child.block.id}
              blockNode={child}
            />
          )
        })}
      </div>
    </div>
  )
}

const BG_COLOR = '#f5f5f5'

function TitleMembersCard({
  title,
  accounts,
  children,
}: {
  title: string
  accounts: {account: HMAccount | null}[]
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        color: 'black',
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: BG_COLOR,
      }}
    >
      <div style={{padding: 60, display: 'flex', flexDirection: 'column'}}>
        {title && (
          <span style={{fontSize: 72, fontWeight: 'bold', marginBottom: 100}}>
            {title}
          </span>
        )}
        {children}
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
          background: `linear-gradient(#ffffff11, #ffffff11, ${BG_COLOR})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 40,
          }}
        >
          {accounts.map((item) => {
            const account = item.account
            const accountLetter =
              account?.profile?.alias?.slice(0, 1) ||
              account?.id?.slice(4, 5) ||
              ''
            if (!account?.profile?.avatar)
              return (
                <div
                  style={{
                    backgroundColor: '#aac2bd', // mintty, yum!
                    display: 'flex',
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: AVATAR_SIZE / 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...avatarLayout,
                  }}
                >
                  <span style={{fontSize: 50, position: 'relative', bottom: 6}}>
                    {accountLetter}
                  </span>
                </div>
              )
            const src = `${IPFS_RESOURCE_PREFIX}${account.profile.avatar}`
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
    </div>
  )
}

function GroupCard({
  group,
  members,
}: {
  group: HMGroup
  members: {account: HMAccount | null}[]
}) {
  return (
    <TitleMembersCard title={group.title || ''} accounts={members}>
      <span>{group.description}</span>
    </TitleMembersCard>
  )
}

function PublicationCard({
  publication,
  editors,
}: {
  publication: HMPublication
  editors: {account: HMAccount | null}[]
}) {
  return (
    <TitleMembersCard
      title={publication.document?.title || ''}
      accounts={editors}
    >
      {publication.document?.children?.map((child, index) => {
        if (index === 0) return null // hide title because we have already shown it
        return (
          <BlockNodeDisplay
            key={child.block.id}
            blockNode={child}
            index={index}
          />
        )
      })}
    </TitleMembersCard>
  )
}

export default async function mediaHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {entityType, entityId, versionId} = req.query
  if (!entityId) throw new Error('Missing entityId')
  if (!versionId) throw new Error('Missing versionId')
  const helpers = serverHelpers({})
  let content: null | JSX.Element = null
  if (entityType === 'd') {
    const documentId = createHmId(entityType, String(entityId))
    const pub = await helpers.publication.get.fetch({
      documentId,
      versionId: String(versionId),
    })
    if (!pub?.publication?.document) throw new Error('Publication not found')
    const {publication} = pub
    const editors = await Promise.all(
      (publication.document?.editors || []).map(async (editorId) => {
        return await helpers.account.get.fetch({accountId: editorId})
      }),
    )
    content = <PublicationCard publication={publication} editors={editors} />
  } else if (entityType === 'g') {
    const groupId = createHmId(entityType, String(entityId))
    const group = await helpers.group.get.fetch({groupId})
    const groupMembers = await helpers.group.listMembers.fetch({groupId})
    const groupMembersAccounts = await Promise.all(
      groupMembers.map(async (membership) => {
        return await helpers.account.get.fetch({accountId: membership.account})
      }),
    )

    content = <GroupCard group={group.group} members={groupMembersAccounts} />
  }
  if (!content) throw new Error('Invalid content')
  const svg = await satori(content, {
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    fonts: [
      {
        name: 'Georgia',
        data: loadFont('Georgia.ttf'),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Georgia',
        data: loadFont('Georgia Bold.ttf'),
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Georgia',
        data: loadFont('Georgia Italic.ttf'),
        weight: 400,
        style: 'italic',
      },
      {
        name: 'Georgia',
        data: loadFont('Georgia Bold Italic.ttf'),
        weight: 700,
        style: 'italic',
      },
    ],
  })
  const png = await new Promise<Buffer>((resolve, reject) =>
    svg2img(svg, function (error, buffer) {
      if (error) reject(error)
      else resolve(buffer)
    }),
  )
  setAllowAnyHostGetCORS(res)
  res.status(200).setHeader('Content-Type', 'image/png').send(png)
}
