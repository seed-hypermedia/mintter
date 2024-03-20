import {
  createHmId,
  groupVariantSchema,
  publicationVariantSchema,
} from '@mintter/shared'
import {z} from 'zod'

export const defaultRoute: NavRoute = {key: 'feed', tab: 'trusted'}

export const feedRouteSchema = z.object({
  key: z.literal('feed'),
  tab: z.union([z.literal('all'), z.literal('trusted')]),
})
export type FeedRoute = z.infer<typeof feedRouteSchema>

export const documentsRouteSchema = z.object({
  key: z.literal('documents'),
  tab: z.union([z.literal('all'), z.literal('trusted'), z.literal('drafts')]),
})
export type DocumentsRoute = z.infer<typeof documentsRouteSchema>

export const contactsRouteSchema = z.object({key: z.literal('contacts')})
export type ContactsRoute = z.infer<typeof contactsRouteSchema>

export const entityVersionsAccessorySchema = z.object({
  key: z.literal('versions'),
})
export type EntityVersionsAccessory = z.infer<
  typeof entityVersionsAccessorySchema
>

export const entityCitationsAccessorySchema = z.object({
  key: z.literal('citations'),
})
export type PublicationCitationsAccessory = z.infer<
  typeof entityCitationsAccessorySchema
>

export const accountRouteSchema = z.object({
  key: z.literal('account'),
  accountId: z.string(),
  accessory: z
    .discriminatedUnion('key', [entityCitationsAccessorySchema])
    .nullable()
    .optional(),
})
export type AccountRoute = z.infer<typeof accountRouteSchema>

export const publicationCommentsAccessorySchema = z.object({
  key: z.literal('comments'),
})
export type PublicationCommentsAccessory = z.infer<
  typeof publicationCommentsAccessorySchema
>

export const commentRouteSchema = z.object({
  key: z.literal('comment'),
  commentId: z.string().optional(),
  showThread: z.boolean().optional(),
})
export type CommentRoute = z.infer<typeof commentRouteSchema>

export const commentDraftRouteSchema = z.object({
  key: z.literal('comment-draft'),
  commentId: z.string().optional(),
  showThread: z.boolean().optional(),
})
export type CommentDraftRoute = z.infer<typeof commentDraftRouteSchema>

export const publicationRouteSchema = z.object({
  key: z.literal('publication'),
  documentId: z.string(),
  versionId: z.string().optional(),
  variants: z.array(publicationVariantSchema).optional(),
  blockId: z.string().optional(),
  groupVariantCategory: z.string().optional(),
  accessory: z
    .discriminatedUnion('key', [
      entityVersionsAccessorySchema,
      entityCitationsAccessorySchema,
      publicationCommentsAccessorySchema,
    ])
    .nullable()
    .optional(),
  showFirstPublicationMessage: z.boolean().optional(),
  immediatelyPromptPush: z.boolean().optional(),
})
export type PublicationRoute = z.infer<typeof publicationRouteSchema>

export const settingsRouteSchema = z.object({key: z.literal('settings')})
export type SettingsRoute = z.infer<typeof settingsRouteSchema>

export const groupsRouteSchema = z.object({key: z.literal('groups')})
export type GroupsRoute = z.infer<typeof groupsRouteSchema>

export const groupRouteSchema = z.object({
  key: z.literal('group'),
  groupId: z.string(),
  version: z.string().optional(),
  blockId: z.string().optional(),
  listCategory: z.string().optional(),
  accessory: z
    .discriminatedUnion('key', [entityVersionsAccessorySchema])
    .nullable()
    .optional(),
})
export type GroupRoute = z.infer<typeof groupRouteSchema>

export const groupFeedRouteSchema = z.object({
  key: z.literal('group-feed'),
  groupId: z.string(),
})
export type GroupFeedRoute = z.infer<typeof groupFeedRouteSchema>

export const draftRouteSchema = z.object({
  key: z.literal('draft'),
  draftId: z.string().optional(),
  variant: groupVariantSchema.nullable(),
  contextRoute: z
    .discriminatedUnion('key', [
      documentsRouteSchema,
      publicationRouteSchema,
      groupRouteSchema,
    ])
    .optional(),
})
export type DraftRoute = z.infer<typeof draftRouteSchema>

export const navRouteSchema = z.discriminatedUnion('key', [
  feedRouteSchema,
  contactsRouteSchema,
  accountRouteSchema,
  settingsRouteSchema,
  groupsRouteSchema,
  groupRouteSchema,
  groupFeedRouteSchema,
  publicationRouteSchema,
  draftRouteSchema,
  documentsRouteSchema,
  commentRouteSchema,
  commentDraftRouteSchema,
])
export type NavRoute = z.infer<typeof navRouteSchema>

export function getRecentsRouteEntityUrl(route: NavRoute) {
  // this is used to uniquely identify an item for the recents list. So it references the entity without specifying version or variant
  if (route.key === 'account') return createHmId('a', route.accountId)
  if (route.key === 'group') return route.groupId
  if (route.key === 'publication') return route.documentId
  // comments do not show up in the recents list, we do not know how to display them
  return null
}
