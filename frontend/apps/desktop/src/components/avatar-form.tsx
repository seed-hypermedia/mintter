import { Avatar } from '@/components/avatar'
import { useMyAccount_deprecated } from '@/models/accounts'
import { API_FILE_UPLOAD_URL } from '@shm/shared'
import { Stack, Tooltip } from '@shm/ui'
import { ChangeEvent } from 'react'
import appError from '../errors'

export function AvatarForm({
  url,
  disabled,
  onAvatarUpload,
}: {
  disabled?: boolean
  url?: string
  onAvatarUpload: (avatar: string) => Awaited<void>
}) {
  const account = useMyAccount_deprecated()
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    const file = fileList?.[0]
    if (!file) return
    handleUpload(file)
      .then(() => { })
      .catch((error) => {
        appError(`Failed to upload avatar: ${e.message}`, { error })
      })
      .finally(() => {
        event.target.value = ''
      })
  }

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(API_FILE_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })
    const data = await response.text()
    if (response.status !== 201) {
      throw new Error(data)
    }
    await onAvatarUpload(data)
  }
  const avatarImage = (
    <Avatar
      label={account.data?.profile?.alias}
      id={account.data?.id}
      size={140}
      url={url}
      color="$blue12"
    />
  )
  if (disabled) return avatarImage
  return (
    <Tooltip content="Click or Drag to Set Avatar Image">
      <Stack hoverStyle={{ opacity: 0.7 }}>
        <input
          type="file"
          onChange={handleFileChange}
          style={{
            opacity: 0,
            display: 'flex',
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            cursor: 'pointer',
          }}
        />
        {avatarImage}
      </Stack>
    </Tooltip>
  )
}
