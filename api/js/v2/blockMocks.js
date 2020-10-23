// single paragraph block
const demo1 = {
  id: 'doc1234asdf',
  author: 'test-user1234',
  blocks: [
    {
      type: 'block_list',
      list_type: 'NONE',
      children: [
        {
          type: 'p',
          id: 'block1',
          children: [{text: 'Hello Block 1'}],
        },
      ],
    },
  ],
}

// 1 nested block list
const demo2 = {
  id: 'doc1234asdf',
  author: 'test-user1234',
  blocks: [
    {
      type: 'block',
      id: 'alskdjhalkjhasdjkh',
      children: [
        {
          type: 'p',
          children: [{text: 'Hello Block 1'}],
        },
        {
          type: 'block_list',
          list_type: 'UNORDERED',
          children: [
            {
              type: 'block',
              id: 'qweoquewopiquwpeoiquwe',
              children: [
                {
                  type: 'p',
                  children: [{text: 'Hello Block 2'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

const demo2 = {
  id: 'doc1234asdf',
  author: 'test-user1234',
  blocks: [
    {
      type: 'a',
      id: 'block2',
      url: 'https://external.link',
      children: [{text: 'Hello Block 1'}],
    },
  ],
}

// ========================

/*

id: doc-1
title: Doc Title
subtitle: Subtitle
author: burdiyan
version: draft:doc-1
parent: ""
publishing_state: DRAFT
block_ref_list:
  style: NONE
  blocks:
    - id: block-1
    - id: block-2
    - id: block-list-parent
      block_ref_list:
        style: BULLET
        blocks:
          - id: child-block-1
          - id: child-block-2


*/
const docDemo = {
  id: 'doc-1',
  title: 'Document demo title',
  subtitle: '',
  author: 'test-author-1234asdf',
  version: '',
  parent: '',
  publishing_state: 'DRAFT',
  block_ref_list: {
    style: 'NONE',
    blocks: [
      {
        id: 'block-1',
      },
      {
        id: 'block-2',
        block_ref_list: {
          style: 'BULLET',
          blocks: [
            {
              id: 'block-2-1',
            },
            {
              id: 'block-2-2',
            },
          ],
        },
      },
    ],
  },
  blocks: [
    {
      id: 'block-1',
      paragraph: {
        inline_elements: [
          {
            text: 'Hello ',
            textStyles: {},
          },
          {
            text: 'World!',
            textStyles: {
              bold: true,
            },
          },
        ],
      },
    },
    {
      id: 'block-2',
      paragraph: {
        inline_elements: [
          {
            text: 'Hello ',
            textStyles: {},
          },
          {
            text: 'Again',
            textStyles: {
              italic: true,
            },
          },
        ],
      },
    },
    {
      id: 'block-2-1',
      paragraph: {
        inline_elements: [
          {
            text: 'Nested block content',
            textStyle: {},
          },
        ],
      },
    },
    {
      id: 'block-2-2',
      paragraph: {
        inline_elements: [
          {
            text: 'Nested block content 2',
            textStyle: {},
          },
        ],
      },
    },
  ],
}

const result = {
  id: 'doc-1',
  title: 'Document demo title',
  subtitle: '',
  author: 'test-author-1234asdf',
  version: '',
  parent: '',
  publishing_state: 'DRAFT',
  block_ref_list: [
    {
      type: 'block_list',
      list_type: 'NONE',
      children: [
        {
          type: 'block',
          id: 'block-1',
          children: [
            {
              type: 'p',
              children: [
                {
                  text: 'Hello ',
                },
                {
                  text: 'World!',
                  bold: true,
                },
              ],
            },
          ],
        },
        {
          type: 'block',
          id: 'block-2',
          children: [
            {
              type: 'p',
              children: [
                {
                  text: 'Hello ',
                },
                {
                  text: 'Again',
                  italic: true,
                },
              ],
            },
            {
              type: 'block_list',
              list_type: 'UNORDERED',
              children: [
                {
                  type: 'block',
                  id: 'block-2-1',
                  children: [
                    {
                      type: 'p',
                      children: [
                        {
                          text: 'FIRST Nested block content',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'block',
                  id: 'block-2-2',
                  children: [
                    {
                      type: 'p',
                      children: [
                        {
                          text: 'SECOND Nested block content',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
