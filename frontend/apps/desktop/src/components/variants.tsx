import { useMyAccount } from '@shm/desktop/src/models/accounts'
import { usePublicationVariant } from '@shm/desktop/src/models/publication'
import {
  useNavRoute
} from '@shm/desktop/src/utils/navigation'
import { useNavigate } from '@shm/desktop/src/utils/useNavigate'
import {
  API_FILE_URL,
  AuthorVariant,
  Document,
  HYPERMEDIA_ENTITY_TYPES,
  UnpackedHypermediaId,
  createPublicWebHmUrl,
  formattedDateMedium,
  unpackHmId
} from '@shm/shared'
import { AuthorVersion } from '@shm/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {
  Button,
  Check,
  Popover,
  SizableText,
  Tooltip,
  UIAvatar,
  View,
  XStack,
  YStack
} from '@shm/ui'
import { ArrowRight, Pencil } from '@tamagui/lucide-icons'
import { ComponentProps, PropsWithChildren, useMemo } from 'react'
import { useAccount } from '../models/accounts'
import { useEntityTimeline } from '../models/changes'
import { useGatewayUrl } from '../models/gateway-settings'
import { DocumentRoute, NavRoute } from '../utils/routes'
import CommitDraftButton from './commit-draft-button'
import DiscardDraftButton from './discard-draft-button'
import { EditDocButton, useEditDraft } from './edit-doc-button'


export function ContextPopover({ ...props }) {
  return (
    <Popover
      size="$5"
      allowFlip={true}
      placement="bottom-end"
      keepChildrenMounted={true}
      {...props}
    />
  )
}

export function ContextPopoverTitle({
  children,
  ...props
}: PropsWithChildren<ComponentProps<typeof SizableText>>) {
  return (
    <SizableText
      marginTop="$2"
      size="$3"
      padding="$2"
      paddingHorizontal="$4"
      fontWeight="bold"
      userSelect="none"
      {...props}
    >
      {children}
    </SizableText>
  )
}

export function ContextPopoverContent(props) {
  return (
    <Popover.Content
      padding={0}
      width={350}
      name={'ContextPopoverContent'}
      borderWidth={2}
      borderColor={'$borderColor'}
      backgroundColor={'$background'}
      elevation={'$2'}
      enterStyle={{ y: -10, opacity: 0 }}
      exitStyle={{ y: -10, opacity: 0 }}
      elevate
      animation={[
        'fast',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
      {...props}
    />
  )
}

export function ContextPopoverArrow(props) {
  return (
    <Popover.Arrow
      name="ContextPopoverArrow"
      borderWidth={1}
      backgroundColor="$background"
      {...props}
    />
  )
}

export function VersionContext({ route }: { route: NavRoute }) {
  let exactVersion: string | null = null
  let fullUrl: string | null = null
  const navigate = useNavigate()
  let unpackedId: UnpackedHypermediaId | null = null
  let latestVersionRoute: NavRoute | null = null
  const gwUrl = useGatewayUrl()
  const pubRoute = route.key === 'document' ? route : null
  const latestPub = usePublicationVariant({
    documentId: pubRoute?.documentId,
    enabled: !!pubRoute?.documentId,
    // version not specified, so we are fetching the latest
  })
  if (route.key === 'document') {
    const { accessory, documentId, versionId, variants } = route
    unpackedId = unpackHmId(documentId)
    exactVersion = versionId || null
    if (
      versionId &&
      latestPub.data?.publication?.version &&
      latestPub.data?.publication?.version !== versionId
    ) {
      latestVersionRoute = {
        key: 'document',
        documentId,
        accessory,
        versionId: undefined,
      }
    }
  }
  fullUrl =
    unpackedId &&
    exactVersion &&
    createPublicWebHmUrl(unpackedId.type, unpackedId.eid, {
      version: exactVersion,
      hostname: gwUrl.data,
    })
  if (!unpackedId || !exactVersion || !fullUrl) return null
  if (!latestVersionRoute) return null
  return (
    <>
      <XStack gap="$2" ai="center">
        {latestVersionRoute ? (
          <View className="no-window-drag">
            <Tooltip
              content={`You are looking at an older version of this ${HYPERMEDIA_ENTITY_TYPES[
                unpackedId.type
              ].toLowerCase()}. Click to go to the latest ${unpackedId.type === 'd' ? 'in this variant' : 'version'
                }.`}
            >
              <Button
                size="$2"
                theme="blue"
                onPress={() => {
                  latestVersionRoute && navigate(latestVersionRoute)
                }}
                iconAfter={ArrowRight}
              >
                Latest Version
              </Button>
            </Tooltip>
          </View>
        ) : null}
      </XStack>
    </>
  )
}

export function PublicationVariants({ route }: { route: DocumentRoute }) {
  const publication = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
  })
  const { variants } = route
  const authorVariants = variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  const pubOwner = publication.data?.publication?.document?.author
  const realAuthorVariants: AuthorVariant[] | undefined = (authorVariants && authorVariants.length) || !pubOwner
    ? authorVariants
    : [{ key: 'author', author: pubOwner }]

  const myAccount = useMyAccount()
  const isAuthorVariantEditable =
    !!realAuthorVariants &&
    !!realAuthorVariants.length &&
    !!myAccount.data?.id &&
    !!realAuthorVariants.find(
      (variant) => variant.author === myAccount.data?.id,
    )
  const showEditButton = isAuthorVariantEditable
  return (
    <>

      {showEditButton && (
        <EditDocButton
          key="editActions"
          contextRoute={route}
          variants={route.variants}
          docId={route.documentId}
          baseVersion={route.versionId}
        />
      )}
    </>
  )
}

function AuthorVariantItem({
  authorVersion,
  route,
  publication,
  isMerged,
}: {
  authorVersion: AuthorVersion
  route: DocumentRoute
  publication: Document | undefined
  isMerged?: boolean
}) {
  const authorVariants = route.variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  const routeAuthors =
    authorVariants && authorVariants.length
      ? authorVariants.map((variant) => variant.author)
      : undefined
  const author = useAccount(authorVersion.author)
  const navigate = useNavigate()
  const activeAuthors =
    routeAuthors ||
    (publication?.document?.author && !route.variants
      ? [publication?.document?.author]
      : [])
  const isVariantActive = new Set(activeAuthors).has(authorVersion.author)
  const isActive =
    !!publication?.version && publication?.version === authorVersion.version
  const isOwner =
    !!publication?.document?.author &&
    publication.document.author === authorVersion.author
  const canPressCheck = activeAuthors.length > 1 || !isVariantActive
  return (
    <Button
      backgroundColor={'transparent'}
      padding="$1"
      group="item"
      paddingHorizontal="$2"
      onPress={() => {
        navigate({
          ...route,
          versionId: undefined,
          variants: [
            {
              key: 'author',
              author: authorVersion.author,
            },
          ],
        })
      }}
      userSelect="none"
    >
      <XStack jc="space-between" f={1} gap="$4" ai="center">
        <XStack gap="$2" f={1} ai="center">
          <UIAvatar
            id={authorVersion.author}
            size={28}
            url={
              author.data?.profile?.avatar &&
              `${API_FILE_URL}/${author.data?.profile?.avatar}`
            }
            label={author.data?.profile?.alias || authorVersion.author}
          />
          <YStack>
            <XStack gap="$2" ai="center">
              <SizableText
                color={isActive ? '$blue11' : isMerged ? '$color10' : '$color'}
              >
                {author.data?.profile}
              </SizableText>
              {isMerged ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )}'s latest changes have been merged into the current variant`}
                >
                  <XStack>
                    <Check size={16} color={'$color10'} />
                  </XStack>
                </Tooltip>
              ) : null}
              {isActive && !isVariantActive ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )} has the exact same version that you see now`}
                >
                  <XStack>
                    <Check size={16} color={'$blue11'} />
                  </XStack>
                </Tooltip>
              ) : null}
              {isOwner ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )} created this document and controls the default variant`}
                >
                  <XStack
                    borderWidth={1}
                    borderColor="$color8"
                    paddingHorizontal="$1"
                    borderRadius="$2"
                  >
                    <SizableText size="$1" color="$color10">
                      Owner
                    </SizableText>
                  </XStack>
                </Tooltip>
              ) : null}
            </XStack>
            <SizableText color="$color11" size="$1">
              {formattedDateMedium(authorVersion.versionTime)}
            </SizableText>
          </YStack>
        </XStack>
        <XStack
          borderWidth={1}
          hoverStyle={{
            borderColor: canPressCheck ? '$color11' : 'transparent',
          }}
          $group-item-hover={{
            borderColor: canPressCheck ? '$color8' : 'transparent',
          }}
          borderRadius={4}
          borderColor="$colorTransparent"
        >
          <Button
            size="$2"
            chromeless
            paddingHorizontal="$1"
            onPress={(e) => {
              if (!canPressCheck) return
              e.stopPropagation()
              const newAuthors = isVariantActive
                ? activeAuthors.filter((a) => a !== authorVersion.author)
                : [...activeAuthors, authorVersion.author]
              navigate({
                ...route,
                versionId: undefined,
                variants: newAuthors.map((author) => ({
                  key: 'author',
                  author,
                })),
              })
            }}
            borderColor="transparent"
            disabled={!canPressCheck}
            minWidth={30}
          >
            <Check
              color={isVariantActive ? '$blue11' : 'transparent'}
              size="$1"
            />
          </Button>
        </XStack>
      </XStack>
    </Button>
  )
}

function AuthorVariants({
  route,
  publication,
}: {
  route: DocumentRoute
  publication: Document | undefined
}) {
  if (route.key !== 'document') throw new Error('Uh')
  const timeline = useEntityTimeline(route.documentId)
  const myAccount = useMyAccount()
  const myVersion = timeline.data?.authorVersions.find(
    (authorVersion) => authorVersion.author === myAccount.data?.id,
  )
  const { handleEdit, hasExistingDraft } = useEditDraft(route.documentId, {
    version: publication?.version,
    contextRoute: route,
    variants: undefined, // this will result in author variant
    navMode: 'push',
  })
  const allChanges = timeline.data?.allChanges
  const thisVersion = publication?.version
  const authorVersions = timeline.data?.authorVersions
  const authorVersionsMergedMap = useMemo(() => {
    const map: Record<string, boolean> = Object.fromEntries(
      authorVersions?.map((authorVersion) => {
        if (authorVersion.version === thisVersion)
          return [authorVersion.version, false]
        const authorChanges = new Set(authorVersion.version.split('.'))
        const matchedChanges = new Set()
        let walkChanges = new Set(thisVersion?.split('.') || [])
        while (walkChanges.size && matchedChanges.size < authorChanges.size) {
          const stepDeps = new Set<string>()
          walkChanges.forEach((changeId) => {
            const change = allChanges?.[changeId]
            if (!change) return
            if (authorChanges.has(changeId)) matchedChanges.add(changeId)
            else change.deps.forEach((changeDep) => stepDeps.add(changeDep))
          })
          walkChanges = stepDeps
        }
        return [
          authorVersion.version,
          matchedChanges.size === authorChanges.size,
        ]
      }) || [],
    )
    return map
  }, [allChanges, thisVersion, authorVersions])
  return (
    <YStack gap="$2" padding="$2">
      {timeline.data?.authorVersions.map((authorVersion) => (
        <AuthorVariantItem
          key={authorVersion.author}
          route={route}
          authorVersion={authorVersion}
          publication={publication}
          isMerged={authorVersionsMergedMap[authorVersion.version]}
        />
      ))}
      {myVersion ? null : (
        <Button
          size="$2"
          onPress={handleEdit}
          theme={hasExistingDraft ? 'yellow' : undefined}
          chromeless
          icon={Pencil}
        >
          {hasExistingDraft ? 'Edit Variant Draft' : 'Create Variant'}
        </Button>
      )}
    </YStack>
  )
}

function TabsView({
  tabs,
  value,
  onValue,
}: {
  tabs: { key: string; label: string; element: React.ReactNode }[]
  value: string
  onValue: (tabKey: string) => void
}) {
  const activeTab = tabs.find((tab) => tab.key === value)
  return (
    <YStack>
      <XStack>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="$2"
            f={1}
            bg={tab.key === value ? '$blue4' : 'transparent'}
            onPress={() => {
              onValue(tab.key)
            }}
            borderRadius={0}
            borderWidth={0}
            borderBottomWidth={2}
            borderColor={tab.key === value ? '$blue8' : '$color8'}
            hoverStyle={{
              borderColor: tab.key === value ? '$blue8' : '$color8',
            }}
          >
            {tab.label}
          </Button>
        ))}
      </XStack>
      {activeTab?.element}
    </YStack>
  )
}

export function PageContextButton({ }: {}) {
  const route = useNavRoute()
  if (route.key === 'document') {
    return <PublicationVariants route={route} />
  }
  return null
}


export function DraftPublicationButtons() {
  return (
    <>
      <CommitDraftButton />
      <DiscardDraftButton />
    </>
  )
}
