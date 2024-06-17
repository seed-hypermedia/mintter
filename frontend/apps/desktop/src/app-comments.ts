import {HMCommentDraft} from '@shm/shared'
import z from 'zod'
import {commentDraftStore} from './app-store'
import {t} from './app-trpc'

export const commentsApi = t.router({
  getCommentDraft: t.procedure
    .input(
      z.object({
        commentDraftId: z.string().or(z.undefined()).optional(),
      }),
    )
    .query(async ({input}) => {
      if (!input.commentDraftId) return null
      const result = commentDraftStore.get(`Comment-${input.commentDraftId}`)
      if (!result) return null
      return {...result, commentId: input.commentDraftId} as HMCommentDraft
    }),
  getCommentDrafts: t.procedure
    .input(
      z.object({
        docEid: z.string(),
      }),
    )
    .query(({input}) => {
      const result = commentDraftStore.get(`Doc-${input.docEid}`)
      if (!result) return []
      const commentIds = Object.keys(result)
      return commentIds
        .map((commentId) => {
          const comment = commentDraftStore.get(`Comment-${commentId}`)
          if (!comment) return null
          return {
            ...comment,
            commentId,
          }
        })
        .filter(Boolean) as HMCommentDraft[]
    }),
  createCommentDraft: t.procedure
    .input(
      z.object({
        targetDocEid: z.string(),
        targetDocVersion: z.string(),
        targetCommentId: z.string().or(z.null()),
        blocks: z.array(z.any()).optional(),
      }),
    )
    .mutation(async ({input}) => {
      const draftId = Math.random().toString(36).slice(2)
      const prevIndex = commentDraftStore.get(`Doc-${input.targetDocEid}`) || {}
      commentDraftStore.set(`Doc-${input.targetDocEid}`, {
        ...prevIndex,
        [draftId]: true,
      })
      commentDraftStore.set(`Comment-${draftId}`, {
        blocks: input.blocks || [],
        targetDocEid: input.targetDocEid,
        targetDocVersion: input.targetDocVersion,
        targetCommentId: input.targetCommentId,
      })
      return draftId
    }),
  writeCommentDraft: t.procedure
    .input(
      z.object({
        commentId: z.string(),
        blocks: z.array(z.any()),
      }),
    )
    .mutation(async ({input}) => {
      const commentId = input.commentId
      const comment = commentDraftStore.get(`Comment-${commentId}`)
      if (!comment) throw new Error('Comment with this commentId not found')
      commentDraftStore.set(`Comment-${commentId}`, {
        ...comment,
        blocks: input.blocks,
      })
      return commentId
    }),
  removeCommentDraft: t.procedure
    .input(
      z.object({
        commentId: z.string(),
        // targetDocEid: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      const commentId = input.commentId
      const comment = commentDraftStore.get(`Comment-${commentId}`)
      if (!comment) throw new Error('Comment with this commentId not found')
      commentDraftStore.delete(`Comment-${commentId}`)
      const index = commentDraftStore.get(`Doc-${comment.targetDocEid}`)
      if (!index) throw new Error('Comment index not found')
      commentDraftStore.set(`Doc-${comment.targetDocEid}`, {
        ...index,
        [commentId]: undefined,
      })
      return commentId
    }),
})
