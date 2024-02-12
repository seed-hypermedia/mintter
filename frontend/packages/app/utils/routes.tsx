import {groupVariantSchema, publicationVariantSchema} from '@mintter/shared'
import {z} from 'zod'

export const defaultRoute: NavRoute = {key: 'documents', tab: 'trusted'}

export const documentsRouteSchema = z.object({
  key: z.literal('documents'),
  tab: z.union([z.literal('all'), z.literal('trusted'), z.literal('drafts')]),
})
export type DocumentsRoute = z.infer<typeof documentsRouteSchema>

export const contactsRouteSchema = z.object({key: z.literal('contacts')})
export type ContactsRoute = z.infer<typeof contactsRouteSchema>

export const accountRouteSchema = z.object({
  key: z.literal('account'),
  accountId: z.string(),
})
export type AccountRoute = z.infer<typeof accountRouteSchema>

export const entityVersionsAccessorySchema = z.object({
  key: z.literal('versions'),
})
export type EntityVersionsAccessory = z.infer<
  typeof entityVersionsAccessorySchema
>

export const publicationCitationsAccessorySchema = z.object({
  key: z.literal('citations'),
})
export type PublicationCitationsAccessory = z.infer<
  typeof publicationCitationsAccessorySchema
>

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
  accessory: z
    .discriminatedUnion('key', [
      entityVersionsAccessorySchema,
      publicationCitationsAccessorySchema,
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
  accessory: z
    .discriminatedUnion('key', [entityVersionsAccessorySchema])
    .nullable()
    .optional(),
})

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

export type GroupRoute = z.infer<typeof groupRouteSchema>

export const navRouteSchema = z.discriminatedUnion('key', [
  contactsRouteSchema,
  accountRouteSchema,
  settingsRouteSchema,
  groupsRouteSchema,
  groupRouteSchema,
  publicationRouteSchema,
  draftRouteSchema,
  documentsRouteSchema,
  commentRouteSchema,
  commentDraftRouteSchema,
])
export type NavRoute = z.infer<typeof navRouteSchema>
