import * as React from 'react';
import { SlateReactPresentation } from 'slate-react-presentation';
import { useParams } from 'react-router-dom';
import type mintter from '@mintter/api/v2/mintter_pb';
import { ELEMENT_BLOCK } from '@mintter/editor/block-plugin/defaults';
import { ELEMENT_READ_ONLY } from '@mintter/editor/readonly-plugin/defaults';
import { ELEMENT_TRANSCLUSION } from '@mintter/editor/transclusion-plugin/defaults';
// import { Icons } from 'components/icons';
import { useAuthor, useProfile, usePublication } from './mintter-hooks';
import { AuthorLabel } from './author-label';
import { ELEMENT_PARAGRAPH } from '@mintter/editor/elements/defaults';
import { Link } from './link';
import { useSidePanel } from './sidepanel';
import { isLocalNode } from './constants';
import { Tooltip } from './tooltip';

// TODO: fix types
export function SidePanelObject(props: any) {
  // same types as in `editor-page.tsx`
  const { documentId: draftId } = useParams<{ documentId: string }>();
  const [documentId] = React.useState(props.id.split('/')[0]);
  const { isLoading, isError, error, data } = usePublication(documentId);
  const { data: author } = useAuthor(data?.document?.author);
  const [open, setOpen] = React.useState(true);
  const { dispatch } = useSidePanel();
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
    <li
      aria-label="document card"
      className="border border-muted rounded-lg m-4 break-words whitespace-pre-wrap relative bg-white"
    >
      <div className="p-4">
        <div className="flex justify-between items-center text-muted-hover">
          <p className="text-muted-hover text-xs uppercase">Document</p>
          <div>
            <button
              onClick={() => setOpen((val) => !val)}
              className="rounded hover:bg-background-muted p-1 hover:text-body-muted transition duration-100"
            >
              {/* // TODO: add icons */}
              {/* {open ? (
                <Icons.ChevronUp size={16} color="currentColor" />
              ) : (
                <Icons.ChevronDown size={16} color="currentColor" />
              )} */}
            </button>
            <button
              onClick={() =>
                dispatch({ type: 'remove_object', payload: props.id })
              }
              className="rounded hover:bg-background-muted p-1 hover:text-body-muted transition duration-100"
            >
              {/* // TODO: add icons */}
              {/* <Icons.X size={16} color="currentColor" /> */}
            </button>
          </div>
        </div>
        <h2 className="font-bold mt-2">{data?.document?.title}</h2>

        <AuthorLabel
          author={author as mintter.Profile.AsObject}
          className="text-sm"
        />
      </div>
      {open && (
        <div className=" pb-2 border-t">
          <ContentRenderer
            isEditor={props.isEditor}
            // TODO: pass correct document here
            value={{}}
            onTransclude={onTransclude}
          />
        </div>
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
    <div className="border-t">
      <Link
        to={`/p/${version}`}
        className="flex items-center p-4 text-primary text-sm font-bold hover:bg-background-muted"
      >
        {/* TODO: add icon */}
        {/* <Icons.CornerDownLeft size={16} color="currentColor" /> */}
        <span className="mx-2">Open in main panel</span>
      </Link>
    </div>
  );
}

// TODO: fix types
function ContentRenderer({ value, isEditor = false, onTransclude }: any) {
  const renderElement = React.useCallback(({ children, ...props }) => {
    switch (props.element.type) {
      case ELEMENT_BLOCK:
        return (
          <IPWrapper isEditor={isEditor} onTransclude={onTransclude} {...props}>
            {children}
          </IPWrapper>
        );
      case ELEMENT_TRANSCLUSION:
        return (
          <IPWrapper isEditor={isEditor} onTransclude={onTransclude} {...props}>
            {children}
          </IPWrapper>
        );
      case ELEMENT_READ_ONLY:
        return (
          <div className="bg-background -mx-2 px-2 rounded mt-1" {...props}>
            {children}
          </div>
        );
      case ELEMENT_PARAGRAPH:
        return (
          <p {...props} style={{ margin: 0 }}>
            {children}
          </p>
        );
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
    <div
      {...attributes}
      className={`flex items-start relative px-4 pt-4 ${
        !isEditor ? 'pl-0' : ''
      }`}
    >
      {isEditor && (
        <Tooltip content="Transclude to current document">
          <button onClick={() => onTransclude(element)}>
            icon
            {/* // TODO: add icons */}
            {/* <Icons.CornerDownLeft size={12} color="currentColor" /> */}
          </button>
        </Tooltip>
      )}
      <div className={`${!isEditor ? 'pl-4' : ''} w-full`}>{children}</div>
    </div>
  );
}
