import * as React from 'react';
import {
  useQuery,
  useMutation,
  UseQueryResult,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  QueryFunctionContext,
  UseQueryOptions,
  useQueryClient,
} from 'react-query';
import type mintter from '@mintter/api/v2/mintter_pb';
import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import type accounts from '@mintter/api/accounts/v1alpha/accounts_pb';
import type networking from '@mintter/api/networking/v1alpha/networking_pb';
import * as apiClient from '@mintter/client';
import type { QueryOptions } from '@testing-library/dom';
import type daemon from '@mintter/api/daemon/v1alpha/daemon_pb';
import { buildBlock, buildTextInlineElement } from '@utils/generate';
import { ELEMENT_QUOTE } from './editor/quote-plugin';
import type { EditorTextRun, SlateBlock } from './editor/types';
import { toEditorValue } from './to-editor-value';
import type { data } from 'autoprefixer';
import { MINTTER_LINK_PREFIX } from './editor/link-plugin';

export function useAccount(
  accountId?: string,
  options: UseQueryOptions<accounts.Account, unknown, accounts.Account> = {},
): Omit<UseQueryResult<accounts.Account>, 'data'> & {
  data?: accounts.Account.AsObject;
} {
  const accountQuery = useQuery(
    ['Account', accountId],
    () => apiClient.getAccount(accountId),
    options,
  );

  const data = React.useMemo(() => accountQuery.data?.toObject(), [
    accountQuery.data,
  ]);

  return {
    ...accountQuery,
    data,
  };
}

export function useInfo(
  options?: UseQueryOptions<daemon.Info, unknown, daemon.Info>,
) {
  const infoQuery = useQuery<daemon.Info, unknown, daemon.Info>(
    ['GetInfo'],
    apiClient.getInfo,
    options,
  );

  const data = React.useMemo(() => infoQuery.data?.toObject(), [
    infoQuery.data,
  ]);

  return {
    ...infoQuery,
    data,
  };
}

export function usePeerAddrs(
  peerId?: string,
  options?: UseQueryOptions<networking.PeerInfo, unknown, networking.PeerInfo>,
) {
  // query getInfo if peerId is undefined
  // query peerAddrs if peerId is defined or if getInfo is done
  const queryClient = useQueryClient();

  let requestId: string;
  if (!peerId) {
    const info = queryClient.getQueryData<daemon.Info.AsObject>('GetInfo');
    requestId = info?.peerId as string;
  } else {
    requestId = peerId;
  }

  const peerAddrsQuery = useQuery(
    ['PeerAddrs', requestId],
    () => apiClient.listPeerAddrs(requestId),
    {
      enabled: !!requestId,
      ...options,
    },
  );

  const data = React.useMemo(() => peerAddrsQuery.data?.toObject().addrsList, [
    peerAddrsQuery.data,
  ]);

  return {
    ...peerAddrsQuery,
    data,
  };
}

export function usePublication(
  publicationId: string,
  version?: string,
  options = {},
) {
  if (!publicationId) {
    throw new Error(`usePublication: parameter "publicationId" is required`);
  }

  if (Array.isArray(publicationId)) {
    throw new Error(
      `Impossible render: You are trying to access a document passing ${
        publicationId.length
      } document Ids => ${publicationId.map((q) => q).join(', ')}`,
    );
  }

  const pubQuery = useQuery(
    ['Publication', publicationId, version],
    async ({ queryKey }) => {
      const [_key, publicationId, version] = queryKey;
      return apiClient.getPublication(publicationId, version);
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  );

  const data = React.useMemo(() => pubQuery.data?.toObject?.(), [
    pubQuery.data,
  ]);

  return {
    ...pubQuery,
    data,
  };
}

export function useDraft(
  draftId: string,
  options = {},
): Omit<UseQueryResult<documents.Document>, 'data'> & {
  data?: documents.Document.AsObject & { editorValue: Array<SlateBlock> };
} {
  if (!draftId) {
    throw new Error(`useDraft: parameter "draftId" is required`);
  }

  if (Array.isArray(draftId)) {
    throw new Error(
      `Impossible render: You are trying to access a draft passing ${
        draftId.length
      } draft Ids => ${draftId.map((q) => q).join(', ')}`,
    );
  }

  const draftQuery = useQuery(
    ['Draft', draftId],
    async ({ queryKey }) => {
      const [_key, draftId] = queryKey;
      return apiClient.getDraft(draftId);
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  );

  const data = React.useMemo(() => draftQuery.data, [
    draftQuery.data,
  ]) as documents.Document;

  return {
    ...draftQuery,
    data: data
      ? {
          ...data.toObject(),
          editorValue: toEditorValue(data),
        }
      : undefined,
  };
}

export function useDocument<TError = unknown>(documentId: string) {
  // return document object
  const documentQuery = useQuery<documents.Document>(
    ['Document', documentId],
    () => apiClient.getDocument(documentId),
    {
      enabled: !!documentId,
    },
  );

  const data: documents.Document.AsObject | undefined = React.useMemo(
    () => documentQuery.data?.toObject(),
    [documentQuery.data],
  );

  return {
    ...documentQuery,
    data,
  };
}

export function useQuote<TError = unknown>(entry: string) {
  const quoteUrl = isValidQuoteUrl(entry);
  if (!quoteUrl)
    throw Error(
      `useQuote > Invalid Quote URL: ${entry} does not match the Quote URL format: mtt://documentID/quoteID`,
    );
  const [documentId, quoteId] = quoteUrl.split('/');
  console.log(
    '🚀 ~ file: mintter-hooks.ts ~ line 213 ~ quoteId',
    quoteId,
    !!quoteId,
  );
  const quoteQuery = useQuery(
    ['Quote', quoteId],
    async () => {
      // query document
      // getBlocksMap
      // return quoteBlock
      console.log('inside async function top');

      const block = buildBlock({
        id: quoteId,
        elementsList: [
          buildTextInlineElement({ text: `${quoteId}: dummy quote text` }),
        ],
      });
      console.log('inside async function top');
      return await Promise.resolve(block);
    },
    {
      enabled: !!quoteId,
    },
  );

  console.log({ quoteQuery });

  const data = React.useMemo(() => quoteQuery.data?.toObject(), [
    quoteQuery.data,
    quoteId,
  ]);

  return {
    ...quoteQuery,
    data,
  };
}

function isValidQuoteUrl(entry: string): boolean {
  if (!entry.startsWith(MINTTER_LINK_PREFIX))
    throw Error(
      `useQuote > Invalid Quote URL: ${quoteUrl} does not start with ${MINTTER_LINK_PREFIX}`,
    );
  const [, url] = entry.split(MINTTER_LINK_PREFIX);
  if (url.includes('/') && url.split('/').length == 2) {
    return url;
  }
  return false;
}

export function toSlateQuote(
  entry: documents.Block.AsObject,
): Array<EditorTextRun> {
  //@ts-ignore
  return entry.elementsList.map((element: documents.InlineElement.AsObject) => {
    // assume elements are type textRun for now
    let node: EditorTextRun = { text: '' };
    if (element.textRun) {
      const { textRun } = element;
      node.text = textRun.text;
      Object.keys(textRun).forEach(
        //@ts-ignore
        (key) => {
          //@ts-ignore
          if (typeof textRun[key] === 'boolean' && textRun[key]) {
            //@ts-ignore
            node[key] = true;
          }
        },
      );

      return node;
      // console.log({node})
      // return element.textRun
    }

    return null;
  });
}

/**
 *
 * @deprecated
 */
export function useConnectionList({ page } = { page: 0 }, options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  };
}

/**
 *
 * @deprecated
 */
export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  };
}

/**
 *
 * @deprecated
 */
export function useConnectionCreate() {
  return {
    connectToPeer: () => {},
  };
}

/**
 *
 * @deprecated
 */
export function usePublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}

/**
 *
 * @deprecated
 */
export function useOthersPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}

/**
 *
 * @deprecated
 */
export function useMyPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}

/**
 *
 * @deprecated
 */
export function useDraftsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}
