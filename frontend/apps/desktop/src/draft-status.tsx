import {eventStream} from '@shm/shared'

export type DraftStatus = 'idle' | 'changed' | 'saving' | 'saved' | 'error'
export const [dispatchDraftStatus, draftStatus] = eventStream<DraftStatus>()
