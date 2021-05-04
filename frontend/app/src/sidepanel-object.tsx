import * as React from 'react';
import { SlateReactPresentation } from 'slate-react-presentation';
import { useParams } from 'react-router-dom';
import type mintter from '@mintter/api/v2/mintter_pb';
// import { Icons } from 'components/icons';
import { useAuthor, useProfile, usePublication } from '@mintter/hooks';
import { AuthorLabel } from './author-label';
import { Link } from './link';
import { useSidePanel } from './sidepanel';
import { isLocalNode } from './constants';
import { Tooltip } from './components/tooltip';

// TODO: fix types
export function SidePanelObject(props: any) {
  // same types as in `editor-page.tsx`
  const { documentId: draftId } = useParams<{ documentId: string }>();
  const [documentId] = React.useState(props.id.split('/')[0]);
  const { isLoading, isError, error, data } = usePublication(documentId);
  const { data: author } = useAuthor(data?.document?.author);
  const [open, setOpen] = React.useState(true);
  const { sidepanelSend } = useSidePanel();
  const { data: user, isSuccess: isProfileSuccess } = useProfile();
  const isAuthor = React.useMemo(() => {
    return user?.accountId === data?.document?.author;
  }, [user, data]);

  // TODO: fix types
  async function onTransclude(block: any) {
    // const updatedDraft = await props.createTransclusion({
    //   source: documentId,
    //   destination: draftId,
    //   block,
    // });
    // queryCache.refetchQueries(['Document', updatedDraft]);
    console.log('noop: fix the transclusion method');
  }

  if (isLoading) {
    return (
      <li>
        <p>loading...</p>;
      </li>
    );
  }

  if (isError) {
    return (
      <li>
        <p>ERROR</p>
      </li>
    );
  }

  // const { title, blockRefList } = data?.document;

  // const doc = toSlateTree({
  //   blockRefList,
  //   blocksMap: data.blocksMap,
  //   isRoot: true,
  // });

  return (
    <li aria-label="document card">
      <p className="text-muted-hover text-xs uppercase">Document</p>

      <button onClick={() => setOpen((val) => !val)}>toggle</button>
      <button
        onClick={() =>
          sidepanelSend?.({
            type: 'SIDEPANEL_REMOVE_OBJECT',
            payload: props.id,
          })
        }
      >
        remove
      </button>

      <h2>{data?.document?.title}</h2>

      <AuthorLabel author={author as mintter.Profile.AsObject} />

      {open && (
        <ContentRenderer
          isEditor={props.isEditor}
          // TODO: pass correct document here
          value={{}}
          onTransclude={onTransclude}
        />
      )}
      {isLocalNode || (isProfileSuccess && isAuthor) ? (
        <ObjectFooter version={documentId} />
      ) : null}
    </li>
  );
}

// TODO: fix types
function ObjectFooter({ version }: any) {
  return (
    <div>
      <Link to={`/p/${version}`}>
        <span>Open in main panel</span>
      </Link>
    </div>
  );
}

// TODO: fix types
function ContentRenderer({ value, isEditor = false, onTransclude }: any) {
  const renderElement = React.useCallback(({ children, ...props }) => {
    switch (props.element.type) {
      // case ELEMENT_BLOCK:
      //   return (
      //     <IPWrapper isEditor={isEditor} onTransclude={onTransclude} {...props}>
      //       {children}
      //     </IPWrapper>
      //   );
      // case ELEMENT_READ_ONLY:
      //   return (
      //     <div className="bg-background -mx-2 px-2 rounded mt-1" {...props}>
      //       {children}
      //     </div>
      //   );
      // case ELEMENT_PARAGRAPH:
      //   return (
      //     <p {...props} style={{ margin: 0 }}>
      //       {children}
      //     </p>
      //   );
      default:
        return children;
    }
  }, []);

  const renderLeaf = React.useCallback(({ attributes, children, leaf }) => {
    if (leaf.bold) {
      children = <strong>{children}</strong>;
    }

    return <span {...attributes}>{children}</span>;
  }, []);

  return (
    <div contentEditable={false} className="prose-lg">
      <SlateReactPresentation
        value={value}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
      />
    </div>
  );
}

// TODO: fix types
function IPWrapper({
  attributes,
  children,
  element,
  isEditor,
  onTransclude,
}: any) {
  return (
    <div {...attributes}>
      {isEditor && (
        <Tooltip content="Transclude to current document">
          <button onClick={() => onTransclude(element)}>icon</button>
        </Tooltip>
      )}
      <div>{children}</div>
    </div>
  );
}
