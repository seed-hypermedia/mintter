import {
  useQuery,
  UseQueryResult,
  UseQueryOptions,
  useQueryClient,
} from 'react-query';
import type { Account } from '@mintter/api/accounts/v1alpha/accounts'
import type { Info } from '@mintter/api/daemon/v1alpha/daemon'
import type { PeerInfo } from '@mintter/api/networking/v1alpha/networking'
import type { Block, Document } from '@mintter/api/documents/v1alpha/documents'
import { getAccount, getDocument, getDraft, getInfo, getPublication, listPeerAddrs } from '@mintter/client'

import { buildBlock } from '@utils/generate';
import type { EditorTextRun, SlateBlock } from './editor/types';
import { toEditorValue } from './to-editor-value';
import { useMemo } from 'react';

export function useAccount(
  accountId?: string,
  options: UseQueryOptions<Account, unknown, Account> = {},
): Omit<UseQueryResult<Account>, 'data'> & {
  data?: Account;
} {
  const accountQuery = useQuery(
    ['Account', accountId],
    () => getAccount(accountId),
    options,
  );

  const data = useMemo(() => accountQuery.data, [
    accountQuery.data,
  ]);

  return {
    ...accountQuery,
    data,
  };
}

export function useInfo(
  options?: UseQueryOptions<Info, unknown, Info>,
) {
  const infoQuery = useQuery<Info, unknown, Info>(
    ['GetInfo'],
    getInfo,
    options,
  );

  const data = useMemo(() => infoQuery.data, [
    infoQuery.data,
  ]);

  return {
    ...infoQuery,
    data,
  };
}

export function usePeerAddrs(
  peerId?: string,
  options?: UseQueryOptions<
    PeerInfo,
    unknown,
    PeerInfo
  >,
) {
  // query getInfo if peerId is undefined
  // query peerAddrs if peerId is defined or if getInfo is done
  const queryClient = useQueryClient();

  let requestId: string;
  if (!peerId) {
    const info = queryClient.getQueryData<Info>('GetInfo');
    requestId = info?.peerId as string;
  } else {
    requestId = peerId;
  }

  const peerAddrsQuery = useQuery(
    ['PeerAddrs', requestId],
    () => listPeerAddrs(requestId),
    {
      enabled: !!requestId,
      ...options,
    },
  );

  const data = useMemo(() => peerAddrsQuery.data?.addrs, [
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
      `Impossible render: You are trying to access a document passing ${publicationId.length
      } document Ids => ${publicationId.map((q) => q).join(', ')}`,
    );
  }

  const pubQuery = useQuery(
    ['Publication', publicationId, version],
    async ({ queryKey }) => {
      const [_key, publicationId, version] = queryKey;
      return getPublication(publicationId, version);
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  );

  const data = useMemo(() => pubQuery.data, [
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
): Omit<UseQueryResult<Document>, 'data'> & {
  data?: Document & { editorValue: Array<SlateBlock> };
} {
  if (!draftId) {
    throw new Error(`useDraft: parameter "draftId" is required`);
  }

  if (Array.isArray(draftId)) {
    throw new Error(
      `Impossible render: You are trying to access a draft passing ${draftId.length
      } draft Ids => ${draftId.map((q) => q).join(', ')}`,
    );
  }

  const draftQuery = useQuery(
    ['Draft', draftId],
    async ({ queryKey }) => {
      const [_key, draftId] = queryKey;
      return getDraft(draftId);
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  );

  const data = useMemo(() => draftQuery.data, [
    draftQuery.data,
  ])

  return {
    ...draftQuery,
    data: data
      ? {
        ...data,
        editorValue: toEditorValue(data),
      }
      : undefined,
  };
}

export function useDocument<TError = unknown>(documentId: string) {
  // return document object
  const documentQuery = useQuery<Document>(
    ['Document', documentId],
    () => getDocument(documentId),
    {
      enabled: !!documentId,
    },
  );

  const data: Document | undefined = useMemo(
    () => documentQuery.data,
    [documentQuery.data],
  );

  return {
    ...documentQuery,
    data,
  };
}

export function useQuote<TError = unknown>(quoteUrl: string) {
  if (!isValidQuoteUrl(quoteUrl))
    throw new Error(`useQuote > Invalid Quote URL: ${quoteUrl}`);
  const [documentId, quoteId] = quoteUrl.split('/');
  const quoteQuery = useQuery(
    ['Quote', quoteId],
    async () => {
      // query document
      // getBlocksMap
      // return quoteBlock
      const block = buildBlock({ id: quoteId });
      return Promise.resolve(block);
    },
    {
      enabled: !!quoteId,
    },
  );

  const data = useMemo(() => quoteQuery.data, [
    quoteQuery.data,
    quoteId,
  ]);

  return {
    ...quoteQuery,
    data,
  };
}

function isValidQuoteUrl(url: string): boolean {
  return url.includes('/') && url.split('/').length == 2;
}

export function toSlateQuote(
  entry: Block,
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
    connectToPeer: () => { },
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
