import { useHistory, useParams } from 'react-router-dom';
import { useMemo, useEffect } from 'react'
import slugify from 'slugify';
import type { Publication as TPublication, Document } from '@mintter/api/documents/v1alpha/documents'
import { useDraftsList } from '@mintter/client/drafts'
import { usePublication as usePublicationQuery } from '@mintter/client/publications'
import { useSidePanel } from '../sidepanel';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Container } from '@components/container';
import { buildDocument } from '@utils/generate';

export default function Publication() {
  const history = useHistory();
  // const { addToast } = useToasts();

  // request document
  const { isLoading, isError, error, data, value } = usePublication();

  // sidepanel
  const { isSidepanelOpen, sidepanelObjects, sidepanelSend } = useSidePanel();

  // get Drafts for editorOptions
  const { data: drafts = [] } = useDraftsList();

  // draftCreation
  // const [createDraft] = useMutation(apiClient.createDraft, {
  //   onSuccess: () => {
  //     queryCache.refetchQueries('Drafts');
  //   },
  // });

  // block menu dispatch
  //   const blockMenuDispatch = useBlockMenuDispatch();

  // transclusions
  //   const { createTransclusion } = useTransclusion();

  async function handleInteract() {
    //     if (
    //       getPath(match).includes('admin') ||
    //       isLocalhost(window.location.hostname)
    //     ) {
    //       const d = await createDraft();
    //       const value = d.toObject();
    //       history.push(
    //         `${getPath(match)}/editor/${value.version}?object=${
    //           data.document?.version
    //         }`,
    //       );
    //     } else {
    //       history.push(
    //         `${location.pathname}${
    //           location.search ? `${location.search}&modal=show` : '?modal=show'
    //         }`,
    //       );
    //     }
  }

  //   const handleQuotation = (document: Document.AsObject) => async ({
  //     block,
  //     destination,
  //   }: {
  //     block: SlateBlock;
  //     destination?: Document.AsObject;
  //   }) => {
  //     const draftUrl = await createTransclusion({
  //       source: document.version,
  //       destination: destination ? destination.version : undefined,
  //       block: block,
  //     });

  //     history.push(`${getPath(match)}/editor/${draftUrl}`);
  //   };

  //   const handleSidepanel = (document: Document.AsObject) => (
  //     blockId: string,
  //   ) => {
  //     const objectId = blockId.includes('/')
  //       ? blockId
  //       : `${document.version}/${blockId}`;

  //     sidepanelSend({
  //       type: 'add_object',
  //       payload: objectId,
  //     });
  //   };

  //   function onCopyBlockId(blockId: string) {
  //     const id = blockId.includes('/')
  //       ? blockId
  //       : `${data.document?.version}/${blockId}`;
  //     const res = copyTextToClipboard(`mintter://${id}`);
  //     if (res) {
  //       addToast('Block Ref copied to your clipboard!', {
  //         appearance: 'success',
  //       });
  //     } else {
  //       addToast('Error while copying to Clipboard!', {
  //         appearance: 'error',
  //       });
  //     }
  //   }

  //   const onQuote = React.useCallback(handleQuotation(data?.document), [data]);
  //   const onSidePanel = React.useCallback(handleSidepanel(data?.document), [
  //     data,
  //   ]);

  //   React.useEffect(() => {
  //     blockMenuDispatch({
  //       type: 'set_actions',
  //       payload: {
  //         onQuote,
  //         onCopyBlockId,
  //         onSidePanel,
  //         useDocument,
  //         drafts,
  //       },
  //     });
  //   }, [onQuote, onSidePanel, useDocument, drafts]);

  // start rendering
  if (isError) {
    console.error('useDraft error: ', error);
    return <Text>Publication ERROR</Text>;
  }

  if (isLoading) {
    return <Text>loading publication...</Text>;
  }

  return (
    <Box
      css={{
        display: 'grid',
        minHeight: '$full',
        gridTemplateAreas: isSidepanelOpen
          ? `"controls controls controls"
        "maincontent maincontent rightside"`
          : `"controls controls controls"
        "maincontent maincontent maincontent"`,
        gridTemplateColumns: 'minmax(300px, 25%) 1fr minmax(300px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
      }}
    >
      {/* <Seo title={data.document?.title} description={data.document?.subtitle} /> */}
      <Box
        css={{
          display: 'flex',
          gridArea: 'controls',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '$2',
          paddingHorizontal: '$5',
        }}
      >
        controls
      </Box>
      <Container css={{ gridArea: 'maincontent', marginBottom: 300 }}>
        <PublicationHeader document={data?.document} />
        {value && <p>EDITOR HERE</p>}
      </Container>
      {isSidepanelOpen ? (
        <Box
          css={{
            height: '100%',
            minHeight: '100%',
            overflow: 'auto',
            zIndex: 0,
            background: 'red',
          }}
        >
          <Box>
            {/* <MintterIcon size="1.5em" /> */}
            <Button
              onClick={() => sidepanelSend?.({ type: 'SIDEPANEL_CLOSE' })}
            >
              Close Sidepanel
              {/* <Icons.ChevronRight size={14} color="currentColor" /> */}
            </Button>
          </Box>
          <Box as="ul" aria-label="sidepanel list">
            {sidepanelObjects.map((object) => (
              // <SidePanelObject key={object} id={object} />
              <Box />
            ))}
          </Box>
          {sidepanelObjects.length === 0 && (
            <SidePanelCTA handleInteract={handleInteract} />
          )}
        </Box>
      ) : null}
      {/* <PublicationModal document={data.document} /> */}
    </Box>
  );
}

// function PublicationError(props) {
//   return props.error ? (
//     <div className="bg-white p-4 text-red-800">ERROR IN PUBLICATION</div>
//   ) : null
// }

function usePublication() {
  // get document version
  const { docId, docVersion = '' } = useParams<{
    docId: string;
    docVersion: string;
  }>();

  const history = useHistory();
  const documentId = useMemo(() => docId.split('-').slice(-1)[0], [
    docId,
  ]);

  const { isSuccess, ...document } = usePublicationQuery(
    documentId,
    docVersion,
  );

  const data: TPublication = {
    document: useMemo(() => buildDocument(), []),
    version: docVersion,
  };

  // add slug to URL
  useEffect(() => {
    if (isSuccess && data?.document) {
      const { title } = data?.document;
      if (title && !docId.includes('-')) {
        const titleSlug = slugify(title, {
          lower: true,
          remove: /[*+~.?()'"!:@]/g,
        });
        history.replace(
          `/p/${titleSlug}-${documentId}${docVersion ? `/${docVersion}` : ''}`,
        );
      }
    }
  }, []);

  return {
    ...document,
    isSuccess,
    data,
    value: [],
  };
  // return {
  //   ...document,
  //   isSuccess,
  //   data,
  //   value:
  //     data && data.document
  //       ? toSlateTree({
  //           blockRefList: data.document.blockRefList,
  //           blocksMap: data?.blocksMap,
  //           isRoot: true,
  //         })
  //       : null,
  // };
}

function PublicationCTA({ handleInteract, visible }: any) {
  return (
    <Box>
      <Text>
        Document created via <Text as="strong">Mintter App.</Text>
      </Text>
      <Text>
        Mintter is a distributed publishing platform that brings to your content{' '}
        <Text as="strong">Ownership, Authorship, Atribution</Text> and{' '}
        <Text as="strong">Traceability.</Text>
      </Text>
      <Button onClick={handleInteract}>
        {/* <Icons.ChevronLeft size={16} color="currentColor" /> */}
        Interact with this document
      </Button>
    </Box>
  );
}

function SidePanelCTA({ handleInteract }: any) {
  return (
    <Box>
      <Text as="h3">Want to add your thougts to this subject?</Text>
      <Text>
        <Text as="strong">Reply, develop</Text> or{' '}
        <Text as="strong">refute</Text> on the Mintter app now.
      </Text>
      <button
        className="bg-primary rounded-full mt-4 px-8 py-2 text-white font-bold shadow transition duration-200 text-sm"
        onClick={handleInteract}
      >
        Write about this Article
      </button>
    </Box>
  );
}

function PublicationHeader({
  document,
}: {
  document: Document | undefined;
}) {
  return document ? (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
        marginBottom: '$5',
        paddingBottom: '$5',
        position: 'relative',
      }}
    >
      <Box css={{ display: 'flex', gap: '$4', alignItems: 'center' }}>
        <Box
          css={{
            background: '$background-neutral',
            width: 32,
            height: 32,
            borderRadius: '$round',
          }}
        />
        <Text size="6">Horacio (TODO)</Text>
      </Box>
      <Text as="h1" size="8">
        {document.title}
      </Text>
      <Text size="6" color="alt" css={{ marginTop: '$5' }}>
        Published on:
      </Text>
      {document.subtitle && (
        <Text color="muted" size="6">
          {document.subtitle}
        </Text>
      )}
      <Box
        css={{
          borderBottom: '2px dotted $colors$background-contrast-soft',
          height: 0,
          maxWidth: '60%',
          margin: '20px 0',
        }}
      />
    </Box>
  ) : null;
}

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let result;

  try {
    document.execCommand('copy');
    result = true;
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    result = false;
  }

  document.body.removeChild(textArea);
  return result;
}
function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    return fallbackCopyTextToClipboard(text);
  }
  return navigator.clipboard.writeText(text).then(
    () => {
      // console.log('Async: Copying to clipboard was successful!!')
      return true;
    },
    (err) => {
      console.error('Async: Could not copy text: ', err);
      return false;
    },
  );
}
