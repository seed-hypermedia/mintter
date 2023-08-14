import {DialogTitle, DialogDescription, useAppDialog} from './dialog'

function PublishGroupDialog({onClose}: {onClose: () => void}) {
  return (
    <>
      <DialogTitle>Publish Group to Site</DialogTitle>
      <DialogDescription>Coming soon.</DialogDescription>
    </>
  )
}

export function usePublishGroupDialog() {
  return useAppDialog<string>(PublishGroupDialog)
}
