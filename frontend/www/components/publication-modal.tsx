import React from 'react'
import {useHistory, useLocation} from 'react-router-dom'
import {useToasts} from 'react-toast-notifications'
import CopyToClipboard from 'react-copy-to-clipboard'
import Modal from 'react-modal'
import {css} from 'emotion'
import {Document} from '@mintter/api/v2/documents_pb'
import {Icons} from '@mintter/editor'
import {useProfileAddrs} from 'shared/profileContext'
import {useTheme} from 'shared/themeContext'
import {MintterIcon} from 'components/mintter-icon'
import * as apiClient from 'shared/mintterClient'
import {useQuery} from 'react-query'

Modal.setAppElement('#__next')

export function PublicationModal({document}: {document: Document.AsObject}) {
  const location = useLocation()
  const history = useHistory()
  const query = new URLSearchParams(location.search)
  const isModalOpen = query.get('modal')
  const {data} = useProfileAddrs()
  const {theme} = useTheme()
  const {addToast} = useToasts()
  const {data: author} = useQuery(
    ['Profile', document.author],
    async () => {
      const author = await apiClient.getProfile('', document.author)
      return author.toObject()
    },
    {enabled: document?.author},
  )

  const copyText = React.useMemo(() => data?.join(','), [data])
  return document ? (
    <Modal
      isOpen={!!isModalOpen}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className={`${theme} absolute top-0 mx-auto my-8 max-w-2xl transform -translate-x-1/2 z-50 ${css`
        left: 50%;
      `}`}
      onRequestClose={() => {
        history.push(location.pathname)
      }}
      data-testid="modal"
      contentLabel="Publication Modal"
    >
      <div className="bg-background p-8 rounded-2xl shadow-lg outline-none focus:shadow-outline">
        <div className="flex items-center justify-between">
          <MintterIcon size="1.5em" />
          <button
            onClick={() => history.push(location.pathname)}
            className="text-gray-500 outline-none focus:shadow-outline p-1 w-6 h-6 rounded-full hover:bg-background-muted transition duration-150 flex items-center justify-center"
          >
            <Icons.X size={15} />
          </button>
        </div>
        <div className="mt-8">
          <h1 className="font-bold text-2xl">
            Mintter App download should launch automatically
          </h1>
        </div>
        <div className="mt-8 border-t pt-8">
          <h2 className="text-2xl font-light">
            {`Keep this information handy, in order to access ${author?.username}’s document
              in the Mintter App.`}
          </h2>
          <div className="mt-6 flex items-center">
            <CopyToClipboard
              text={copyText}
              onCopy={(_, result) => {
                if (result) {
                  addToast(
                    `${author.username}’s Address copied to your clipboard!`,
                    {
                      appearance: 'success',
                    },
                  )
                } else {
                  addToast('Error while copying to Clipboard', {
                    appearance: 'error',
                  })
                }
              }}
            >
              <button className="outline-none focus:shadow-outline text-primary pl-2 pr-4 py-1 font-bold flex items-center rounded-full border-2 border-primary hover:bg-primary hover:text-white transition duration-100">
                <Icons.Copy size={14} color="currentColor" />
                <span className="ml-2">{`Copy ${author?.username}’s user ID`}</span>
              </button>
            </CopyToClipboard>

            <CopyToClipboard
              text={document.version}
              onCopy={(_, result) => {
                if (result) {
                  addToast(`Document's UUID copied to your clipboard!`, {
                    appearance: 'success',
                  })
                } else {
                  addToast('Error while copying to Clipboard', {
                    appearance: 'error',
                  })
                }
              }}
            >
              <button className="outline-none focus:shadow-outline text-primary pl-2 pr-4 py-1 ml-4 font-bold flex items-center rounded-full border-2 border-primary hover:bg-primary hover:text-white transition duration-100">
                <Icons.Copy size={14} color="currentColor" />
                <span className="ml-2">Copy Document UUID</span>
              </button>
            </CopyToClipboard>
          </div>
        </div>
      </div>
    </Modal>
  ) : null
}
