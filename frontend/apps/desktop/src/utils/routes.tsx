import {createHmId} from '@shm/shared'
import {z} from 'zod'

export const defaultRoute: NavRoute = {key: 'home'}

export const homeRouteSchema = z.object({
  key: z.literal('home'),
})

export type HomeRoute = z.infer<typeof homeRouteSchema>

export const feedRouteSchema = z.object({
  key: z.literal('feed'),
})
export type FeedRoute = z.infer<typeof feedRouteSchema>

export const exploreRouteSchema = z.object({
  key: z.literal('explore'),
})
export type ExploreRoute = z.infer<typeof exploreRouteSchema>

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
export type EntityCitationsAccessory = z.infer<
  typeof entityCitationsAccessorySchema
>

export const documentCommentsAccessorySchema = z.object({
  key: z.literal('comments'),
})
export type DocumentCommentsAccessory = z.infer<
  typeof documentCommentsAccessorySchema
>

export const baseDocumentRouteSchema = z.object({
  key: z.literal('document'),
  documentId: z.string(),
  versionId: z.string().optional(),
  blockId: z.string().optional(),
  isBlockFocused: z.boolean().optional(),
  blockRange: z
    .object({
      start: z.number().optional(),
      end: z.number().optional(),
      expanded: z.boolean().optional(),
    })
    .optional(),
  immediatelyPromptPush: z.boolean().optional(),
  accessory: z
    .discriminatedUnion('key', [
      entityVersionsAccessorySchema,
      entityCitationsAccessorySchema,
      documentCommentsAccessorySchema,
    ])
    .nullable()
    .optional(),
})
export type BaseDocumentRoute = z.infer<typeof baseDocumentRouteSchema>

export const baseAccountRouteSchema = z.object({
  key: z.literal('account'),
  accountId: z.string(),
  blockId: z.string().optional(),
  isBlockFocused: z.boolean().optional(),
  accessory: z
    .discriminatedUnion('key', [entityCitationsAccessorySchema])
    .nullable()
    .optional(),
})
export type BaseAccountRoute = z.infer<typeof baseAccountRouteSchema>

export const baseDraftRouteSchema = z.object({
  key: z.literal('draft'),
  id: z.string().optional(),
})
export type BaseDraftRoute = z.infer<typeof baseDraftRouteSchema>

export const baseEntityRouteSchema = z.discriminatedUnion('key', [
  baseDocumentRouteSchema,
  baseAccountRouteSchema,
  baseDraftRouteSchema,
])
export type BaseEntityRoute = z.infer<typeof baseEntityRouteSchema>

export const accountRouteSchema = baseAccountRouteSchema.extend({
  context: z.array(baseEntityRouteSchema).optional(),
  tab: z.enum(['profile', 'documents', 'activity']).optional(), // profile is the default
})
export type AccountRoute = z.infer<typeof accountRouteSchema>

export const DocumentRouteSchema = baseDocumentRouteSchema.extend({
  context: z.array(baseEntityRouteSchema).optional(),
})
export type DocumentRoute = z.infer<typeof DocumentRouteSchema>

export const favoritesSchema = z.object({
  key: z.literal('favorites'),
})
export type FavoritesRoute = z.infer<typeof favoritesSchema>

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

export const settingsRouteSchema = z.object({key: z.literal('settings')})
export type SettingsRoute = z.infer<typeof settingsRouteSchema>

export const deletedContentRouteSchema = z.object({
  key: z.literal('deleted-content'),
})

export const draftRebaseRouteSchema = z.object({
  key: z.literal('draft-rebase'),
  documentId: z.string(),
  sourceVersion: z.string(),
  targetVersion: z.string(),
})
export type DeletedContentRoute = z.infer<typeof deletedContentRouteSchema>

export const draftRouteSchema = baseDraftRouteSchema.extend({
  contextRoute: z
    .discriminatedUnion('key', [DocumentRouteSchema, accountRouteSchema])
    .optional(),
})
export type DraftRoute = z.infer<typeof draftRouteSchema>

export const navRouteSchema = z.discriminatedUnion('key', [
  feedRouteSchema,
  contactsRouteSchema,
  accountRouteSchema,
  settingsRouteSchema,
  DocumentRouteSchema,
  draftRouteSchema,
  draftRebaseRouteSchema,
  commentRouteSchema,
  commentDraftRouteSchema,
  exploreRouteSchema,
  favoritesSchema,
  deletedContentRouteSchema,
  homeRouteSchema,
])
export type NavRoute = z.infer<typeof navRouteSchema>

export function getRecentsRouteEntityUrl(route: NavRoute) {
  // this is used to uniquely identify an item for the recents list. So it references the entity without specifying version
  if (route.key === 'account') return createHmId('a', route.accountId)
  if (route.key === 'document') return route.documentId
  // comments do not show up in the recents list, we do not know how to display them
  return null
}
