import * as React from 'react';
import { DragDrop } from './drag-drop';
// import {css} from 'emotion'
// import Tippy from '@tippyjs/react'
// import {Icons} from 'components/icons'
import { Tooltip } from '../../../tooltip';
// TODO: decouple this from the editor component
import { usePublication, useAuthor } from '../../../mintter-hooks';
import { useHistory, useRouteMatch } from 'react-router-dom';
// TODO: decouple this from the editor component
import { getPath } from '../../../routes';
// TODO: decouple this from the editor component
import { useSidePanel } from '../../../sidepanel';
import type mintter from '@mintter/api/v2/mintter_pb';
// TODO: reference of something in app from the editor package. how can we do this?
import { isLocalNode } from '../../../constants';

export const Block = ({ attributes, element, children, ...rest }: any) => {
  const [isQuotesVisible, setVisibility] = React.useState<boolean>(false);
  const quoters = element.quotersList?.length;
  function toggleQuotes() {
    setVisibility((val) => !val);
  }
  return (
    <DragDrop {...attributes} element={element} {...rest}>
      {children}
      {isQuotesVisible ? (
        <div contentEditable={false} className="overflow-hidden pl-4">
          {/* // TODO: fix types */}
          {quoters ? (
            element.quotersList.map((quote: any) => (
              <BlockMention key={quote} quote={quote} />
            ))
          ) : (
            <p>...</p>
          )}
        </div>
      ) : null}
      {quoters > 0 && (
        <div
          contentEditable={false}
          style={{ userSelect: 'none' }}
          // className={`absolute ${css`
          //   top: 2px;
          //   right: -18px;
          //   transform: translateX(100%);
          // `}`}
        >
          <Tooltip content="Toggle Mentions">
            <button
              onClick={() => toggleQuotes()}
              className="text-xs font-bold text-info rounded-full hover:bg-background-muted transition duration-200 leading-none flex items-center justify-center w-6 h-6 text-center"
            >
              {quoters}
            </button>
          </Tooltip>
        </div>
      )}
    </DragDrop>
  );
};

// TODO: fix types
function BlockMentionComponent({ quote }: any) {
  const history = useHistory();
  const match = useRouteMatch();
  const isLocal = React.useRef(false);
  const profile = React.useRef<mintter.Profile.AsObject>(null);
  const { isLoading, isError, error, data } = usePublication(quote);
  const { data: author } = useAuthor(data ? data.document?.author : undefined);
  const { sidepanelSend } = useSidePanel();

  const isAuthor = React.useCallback(
    (author) => profile.current?.accountId === author,
    [data],
  );

  React.useEffect(() => {
    isLocal.current = isLocalNode;
    // TODO: replace the use of queryCache
    // profile.current = queryCache.getQueryData('Profile');
  }, []);

  function openInMainPanel(mentionId: string): void {
    history.push(`${getPath(match)}/p/${mentionId}`);
  }

  if (isError) {
    console.error('block mention error', error);
    return <div>Block Mention error :(</div>;
  }

  if (isLoading) {
    return (
      <div className="relative pt-4">
        <div
        // className={`w-4 border-l border-b border-b-background border-l-background rounded-bl absolute top-0 left-0 ${css`
        //   height: calc(100% + 10px);
        //   z-index: 0;
        //   transform: translateY(-44%);
        // `}`}
        />
        <div className="bg-background transition duration-150 hover:shadow-sm rounded ml-4 flex items-center group">
          <div className="px-4 py-2 flex-1">
            <p className="font-bold text-heading text-sm leading-tight">...</p>
            <p className="text-xs text-body-muted leading-tight">...</p>
          </div>
        </div>
      </div>
    );
  }

  const canOpenInMainPanel = isLocal || isAuthor(data?.document?.author);

  return (
    <div className="relative pt-4">
      <div
      // className={`w-4 border-l border-b border-b-background border-l-background rounded-bl absolute top-0 left-0 ${css`
      //   height: calc(100% + 10px);
      //   z-index: 0;
      //   transform: translateY(-44%);
      // `}`}
      />
      <div className="bg-background-muted transition duration-150 hover:shadow-sm rounded ml-4 flex items-center group">
        <div className="px-4 py-2 flex-1">
          <p className="font-bold text-heading text-sm leading-tight">
            {data?.document?.title || 'Untitled Document'}
          </p>
          <p className="text-xs text-body-muted leading-tight">
            {author?.username || '...'}
          </p>
        </div>
        <div className="px-4 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150">
          {canOpenInMainPanel ? (
            <Tooltip content="Open in Main Panel">
              <button
                className="bg-background hover:bg-muted transition duration-150 rounded-sm p-1"
                onClick={() => openInMainPanel(data?.document?.id as string)}
              >
                {/* <Icons.ArrowUpRight size={14} color="currentColor" /> */}
                arrow right
              </button>
            </Tooltip>
          ) : null}

          <Tooltip content="Show in Sidepanel">
            <button
              className="bg-background hover:bg-muted transition duration-150 rounded-sm p-1"
              onClick={() =>
                sidepanelSend?.({
                  type: 'SIDEPANEL_ADD_OBJECT',
                  payload: quote,
                })
              }
            >
              {/* <Icons.CornerDownRight size={14} color="currentColor" /> */}
              corner right
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

const BlockMention = React.memo(BlockMentionComponent);
