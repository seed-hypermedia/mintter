import {Checkbox, createStyles, Stack} from '@mantine/core'
import {createHmDocLink, isHypermediaScheme, unpackHmId} from '@mintter/shared'
import {XStack} from '@mintter/ui'
import {forwardRef, HTMLAttributes, useCallback, useState} from 'react'
import {RiLink, RiText} from 'react-icons/ri'
import {EditHyperlinkMenuItem} from './EditHyperlinkMenuItem'

export type EditHyperlinkMenuProps = {
  url: string
  text: string
  isLatest: boolean
  editCheckboxRef: any
  handleLatest: (value: boolean) => void
  update: (url: string, text: string, latest: boolean) => void
}

/**
 * Menu which opens when editing an existing hyperlink or creating a new one.
 * Provides input fields for setting the hyperlink URL and title.
 */
export const EditHyperlinkMenu = forwardRef<
  HTMLDivElement,
  EditHyperlinkMenuProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      url,
      text,
      isLatest,
      handleLatest,
      editCheckboxRef,
      update,
      className,
      ...props
    },
    ref,
  ) => {
    const {classes} = createStyles({root: {}})(undefined, {
      name: 'EditHyperlinkMenu',
    })

    const [currentUrl, setCurrentUrl] = useState(url)
    const [currentText, setCurrentText] = useState(text)
    const isHmHref = isHypermediaScheme(url)

    const handleVersion = useCallback((versionMode: boolean) => {
      let unpackedRef = unpackHmId(url)
      if (unpackedRef) {
        let newUrl = createHmDocLink({
          documentId: unpackedRef?.qid,
          version: unpackedRef?.version,
          blockRef: unpackedRef?.blockRef,
          variants: unpackedRef?.variants,
          latest: versionMode,
        })
        setCurrentUrl(newUrl)

        update(newUrl, text, true)
      }
    }, [])

    return (
      <Stack
        {...props}
        className={className ? `${classes.root} ${className}` : classes.root}
        ref={ref}
      >
        <EditHyperlinkMenuItem
          icon={RiLink}
          mainIconTooltip={'Edit URL'}
          autofocus={true}
          placeholder={'Edit URL'}
          value={currentUrl}
          onChange={(value) => setCurrentUrl(value)}
          onSubmit={() => update(currentUrl, text, false)}
        />
        <EditHyperlinkMenuItem
          icon={RiText}
          mainIconTooltip={'Edit Title'}
          placeholder={'Edit Title'}
          value={currentText}
          onChange={(value) => setCurrentText(value)}
          onSubmit={() => update(currentUrl, currentText, false)}
        />
        {isHmHref ? (
          <XStack padding="$2">
            <Checkbox
              ref={editCheckboxRef}
              size="xs"
              label="Link to Latest Version"
              checked={isLatest}
              onChange={(event) => {
                // handleVersion(event.currentTarget.checked)
                handleLatest(event.currentTarget.checked)
              }}
            />
          </XStack>
        ) : null}
      </Stack>
    )
  },
)
