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

export const exploreRouteSchema = z.object({
  key: z.literal('explore'),
  tab: z.enum(['docs', 'groups']),
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
export type PublicationCitationsAccessory = z.infer<
  typeof entityCitationsAccessorySchema
>

export const accountRouteSchema = z.object({
  key: z.literal('account'),
  accountId: z.string(),
  blockId: z.string().optional(),
  tab: z.enum(['profile', 'documents', 'groups', 'activity']).optional(), // profile is the default
  accessory: z
    .discriminatedUnion('key', [entityCitationsAccessorySchema])
    .nullable()
    .optional(),
})
export type AccountRoute = z.infer<typeof accountRouteSchema>

export const favoritesSchema = z.object({
  key: z.literal('favorites'),
})
export type FavoritesRoute = z.infer<typeof favoritesSchema>

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
  blockRange: z
    .object({
      start: z.number().optional(),
      end: z.number().optional(),
      expanded: z.boolean().optional(),
    })
    .optional(),
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

export const groupRouteSchema = z.object({
  key: z.literal('group'),
  groupId: z.string(),
  version: z.string().optional(),
  blockId: z.string().optional(),
  tab: z.enum(['front', 'documents', 'activity']).optional(), // front is the default
  accessory: z
    .discriminatedUnion('key', [entityVersionsAccessorySchema])
    .nullable()
    .optional(),
})
export type GroupRoute = z.infer<typeof groupRouteSchema>

export const draftRouteSchema = z.object({
  key: z.literal('draft'),
  draftId: z.string().optional(),
  variant: groupVariantSchema.nullable(),
  isProfileDocument: z.boolean().optional(),
  contextRoute: z
    .discriminatedUnion('key', [
      publicationRouteSchema,
      groupRouteSchema,
      accountRouteSchema,
    ])
    .optional(),
})
export type DraftRoute = z.infer<typeof draftRouteSchema>

export const navRouteSchema = z.discriminatedUnion('key', [
  feedRouteSchema,
  contactsRouteSchema,
  accountRouteSchema,
  settingsRouteSchema,
  groupRouteSchema,
  publicationRouteSchema,
  draftRouteSchema,
  commentRouteSchema,
  commentDraftRouteSchema,
  exploreRouteSchema,
  favoritesSchema,
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
