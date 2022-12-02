import {u} from 'unist-builder'
import {describe, test} from 'vitest'
import {toMttast} from '..'

describe.skip('real hast usecase', () => {
  // FIXME: use this example to refactor the transformers
  test('should convert from dev.to', () => {
    var hast = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'h1',
              properties: {},
              children: [
                {
                  type: 'text',
                  value: 'What Makes You Stay In A Community?',
                  position: {
                    start: {
                      line: 1,
                      column: 1252,
                      offset: 1251,
                    },
                    end: {
                      line: 1,
                      column: 1287,
                      offset: 1286,
                    },
                  },
                },
              ],
              position: {
                start: {
                  line: 1,
                  column: 931,
                  offset: 930,
                },
                end: {
                  line: 1,
                  column: 1292,
                  offset: 1291,
                },
              },
            },
            {
              type: 'element',
              tagName: 'div',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href: 'https://dev.to/t/discuss',
                  },
                  children: [
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: '#',
                          position: {
                            start: {
                              line: 1,
                              column: 2065,
                              offset: 2064,
                            },
                            end: {
                              line: 1,
                              column: 2066,
                              offset: 2065,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 1916,
                          offset: 1915,
                        },
                        end: {
                          line: 1,
                          column: 2073,
                          offset: 2072,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value: 'discuss',
                      position: {
                        start: {
                          line: 1,
                          column: 2073,
                          offset: 2072,
                        },
                        end: {
                          line: 1,
                          column: 2080,
                          offset: 2079,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 1417,
                      offset: 1416,
                    },
                    end: {
                      line: 1,
                      column: 2084,
                      offset: 2083,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href: 'https://dev.to/t/community',
                  },
                  children: [
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: '#',
                          position: {
                            start: {
                              line: 1,
                              column: 2734,
                              offset: 2733,
                            },
                            end: {
                              line: 1,
                              column: 2735,
                              offset: 2734,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 2585,
                          offset: 2584,
                        },
                        end: {
                          line: 1,
                          column: 2742,
                          offset: 2741,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value: 'community',
                      position: {
                        start: {
                          line: 1,
                          column: 2742,
                          offset: 2741,
                        },
                        end: {
                          line: 1,
                          column: 2751,
                          offset: 2750,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 2084,
                      offset: 2083,
                    },
                    end: {
                      line: 1,
                      column: 2755,
                      offset: 2754,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href: 'https://dev.to/t/watercooler',
                  },
                  children: [
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: '#',
                          position: {
                            start: {
                              line: 1,
                              column: 3411,
                              offset: 3410,
                            },
                            end: {
                              line: 1,
                              column: 3412,
                              offset: 3411,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 3262,
                          offset: 3261,
                        },
                        end: {
                          line: 1,
                          column: 3419,
                          offset: 3418,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value: 'watercooler',
                      position: {
                        start: {
                          line: 1,
                          column: 3419,
                          offset: 3418,
                        },
                        end: {
                          line: 1,
                          column: 3430,
                          offset: 3429,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 2755,
                      offset: 2754,
                    },
                    end: {
                      line: 1,
                      column: 3434,
                      offset: 3433,
                    },
                  },
                },
              ],
              position: {
                start: {
                  line: 1,
                  column: 1292,
                  offset: 1291,
                },
                end: {
                  line: 1,
                  column: 3440,
                  offset: 3439,
                },
              },
            },
          ],
          position: {
            start: {
              line: 1,
              column: 769,
              offset: 768,
            },
            end: {
              line: 1,
              column: 3446,
              offset: 3445,
            },
          },
        },
        {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'div',
              properties: {
                id: 'user-content-article-body',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'Hello Friends 👋,',
                      position: {
                        start: {
                          line: 1,
                          column: 4502,
                          offset: 4501,
                        },
                        end: {
                          line: 1,
                          column: 4519,
                          offset: 4518,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 4430,
                      offset: 4429,
                    },
                    end: {
                      line: 1,
                      column: 4523,
                      offset: 4522,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'When I was writing',
                      position: {
                        start: {
                          line: 1,
                          column: 4595,
                          offset: 4594,
                        },
                        end: {
                          line: 1,
                          column: 4613,
                          offset: 4612,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: ' ',
                          position: {
                            start: {
                              line: 1,
                              column: 4649,
                              offset: 4648,
                            },
                            end: {
                              line: 1,
                              column: 4655,
                              offset: 4654,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 4613,
                          offset: 4612,
                        },
                        end: {
                          line: 1,
                          column: 4662,
                          offset: 4661,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'a',
                      properties: {
                        href: 'https://dev.to/adiatiayu/7-supportive-tech-communities-you-want-to-be-part-of-37ik',
                      },
                      children: [
                        {
                          type: 'text',
                          value:
                            '7 Supportive Tech Communities You Want To Be Part Of',
                          position: {
                            start: {
                              line: 1,
                              column: 4849,
                              offset: 4848,
                            },
                            end: {
                              line: 1,
                              column: 4901,
                              offset: 4900,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 4662,
                          offset: 4661,
                        },
                        end: {
                          line: 1,
                          column: 4905,
                          offset: 4904,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value:
                        ', some thoughts crossed my mind. Why do people want to stay in a community? What makes them willing to volunteer in a community?',
                      position: {
                        start: {
                          line: 1,
                          column: 4905,
                          offset: 4904,
                        },
                        end: {
                          line: 1,
                          column: 5033,
                          offset: 5032,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 4523,
                      offset: 4522,
                    },
                    end: {
                      line: 1,
                      column: 5037,
                      offset: 5036,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value:
                        'For me, these are the things that made me stay, being active and willing to contribute to the communities:',
                      position: {
                        start: {
                          line: 1,
                          column: 5109,
                          offset: 5108,
                        },
                        end: {
                          line: 1,
                          column: 5215,
                          offset: 5214,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 5037,
                      offset: 5036,
                    },
                    end: {
                      line: 1,
                      column: 5219,
                      offset: 5218,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'ul',
                  properties: {},
                  children: [
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [
                            {
                              type: 'element',
                              tagName: 'strong',
                              properties: {},
                              children: [
                                {
                                  type: 'text',
                                  value: 'Welcoming',
                                  position: {
                                    start: {
                                      line: 1,
                                      column: 5514,
                                      offset: 5513,
                                    },
                                    end: {
                                      line: 1,
                                      column: 5523,
                                      offset: 5522,
                                    },
                                  },
                                },
                              ],
                              position: {
                                start: {
                                  line: 1,
                                  column: 5453,
                                  offset: 5452,
                                },
                                end: {
                                  line: 1,
                                  column: 5532,
                                  offset: 5531,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 5532,
                                  offset: 5531,
                                },
                                end: {
                                  line: 1,
                                  column: 5611,
                                  offset: 5610,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "Whenever I join a community, I will introduce myself. And I can get that sense of warmth and welcoming atmosphere from how everyone receives me (and other newcomers). It can be either through emojis, GIFs or welcoming replies. When I didn't get that sense of welcome, I would leave.",
                              position: {
                                start: {
                                  line: 1,
                                  column: 5611,
                                  offset: 5610,
                                },
                                end: {
                                  line: 1,
                                  column: 5893,
                                  offset: 5892,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 5391,
                              offset: 5390,
                            },
                            end: {
                              line: 1,
                              column: 5897,
                              offset: 5896,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 5342,
                          offset: 5341,
                        },
                        end: {
                          line: 1,
                          column: 5902,
                          offset: 5901,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [
                            {
                              type: 'element',
                              tagName: 'strong',
                              properties: {},
                              children: [
                                {
                                  type: 'text',
                                  value: 'Inclusivity',
                                  position: {
                                    start: {
                                      line: 1,
                                      column: 6074,
                                      offset: 6073,
                                    },
                                    end: {
                                      line: 1,
                                      column: 6085,
                                      offset: 6084,
                                    },
                                  },
                                },
                              ],
                              position: {
                                start: {
                                  line: 1,
                                  column: 6013,
                                  offset: 6012,
                                },
                                end: {
                                  line: 1,
                                  column: 6094,
                                  offset: 6093,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 6094,
                                  offset: 6093,
                                },
                                end: {
                                  line: 1,
                                  column: 6173,
                                  offset: 6172,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "In this context, I'm talking about inclusivity in general.",
                              position: {
                                start: {
                                  line: 1,
                                  column: 6173,
                                  offset: 6172,
                                },
                                end: {
                                  line: 1,
                                  column: 6231,
                                  offset: 6230,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 6231,
                                  offset: 6230,
                                },
                                end: {
                                  line: 1,
                                  column: 6310,
                                  offset: 6309,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                'There was a time when I joined a community and felt like an outsider. I remember I was a total newbie. And I asked a super noob question. It was a while before anyone responded. And the only response that I got was, "It\'s very basic, bro. It\'s easy. Have you googled?" (Oh, yes. I remember that response clearly as if I heard it yesterday.)',
                              position: {
                                start: {
                                  line: 1,
                                  column: 6310,
                                  offset: 6309,
                                },
                                end: {
                                  line: 1,
                                  column: 6650,
                                  offset: 6649,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 6650,
                                  offset: 6649,
                                },
                                end: {
                                  line: 1,
                                  column: 6729,
                                  offset: 6728,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "First of all, oh, please. I'm not a 'bro' and definitely not your bro!",
                              position: {
                                start: {
                                  line: 1,
                                  column: 6729,
                                  offset: 6728,
                                },
                                end: {
                                  line: 1,
                                  column: 6799,
                                  offset: 6798,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 6799,
                                  offset: 6798,
                                },
                                end: {
                                  line: 1,
                                  column: 6878,
                                  offset: 6877,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 5951,
                              offset: 5950,
                            },
                            end: {
                              line: 1,
                              column: 6882,
                              offset: 6881,
                            },
                          },
                        },
                        {
                          type: 'element',
                          tagName: 'div',
                          properties: {},
                          children: [
                            {
                              type: 'text',
                              value: 'GIF',
                              position: {
                                start: {
                                  line: 1,
                                  column: 8309,
                                  offset: 8308,
                                },
                                end: {
                                  line: 1,
                                  column: 8312,
                                  offset: 8311,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'img',
                              properties: {
                                src: 'https://i.giphy.com/media/dWhHUkuWnGxFK/giphy.gif',
                                alt: 'oh please gif',
                                width: 291,
                                height: 217,
                                id: 'user-content-animated-0',
                              },
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 8706,
                                  offset: 8705,
                                },
                                end: {
                                  line: 1,
                                  column: 9159,
                                  offset: 9158,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 6882,
                              offset: 6881,
                            },
                            end: {
                              line: 1,
                              column: 9165,
                              offset: 9164,
                            },
                          },
                        },
                        {
                          type: 'element',
                          tagName: 'br',
                          properties: {},
                          children: [],
                          position: {
                            start: {
                              line: 1,
                              column: 9165,
                              offset: 9164,
                            },
                            end: {
                              line: 1,
                              column: 9244,
                              offset: 9243,
                            },
                          },
                        },
                        {
                          type: 'text',
                          value:
                            'Second, it may be easy for you, but not for me. Have you never been a newbie?',
                          position: {
                            start: {
                              line: 1,
                              column: 9244,
                              offset: 9243,
                            },
                            end: {
                              line: 1,
                              column: 9321,
                              offset: 9320,
                            },
                          },
                        },
                        {
                          type: 'element',
                          tagName: 'br',
                          properties: {},
                          children: [],
                          position: {
                            start: {
                              line: 1,
                              column: 9321,
                              offset: 9320,
                            },
                            end: {
                              line: 1,
                              column: 9400,
                              offset: 9399,
                            },
                          },
                        },
                        {
                          type: 'text',
                          value:
                            "And most importantly, friends, that kind of response makes newbies doubt themselves and feel like they don't belong in tech.",
                          position: {
                            start: {
                              line: 1,
                              column: 9400,
                              offset: 9399,
                            },
                            end: {
                              line: 1,
                              column: 9524,
                              offset: 9523,
                            },
                          },
                        },
                        {
                          type: 'element',
                          tagName: 'br',
                          properties: {},
                          children: [],
                          position: {
                            start: {
                              line: 1,
                              column: 9524,
                              offset: 9523,
                            },
                            end: {
                              line: 1,
                              column: 9603,
                              offset: 9602,
                            },
                          },
                        },
                        {
                          type: 'text',
                          value:
                            "So, yes. I'm totally staying in an inclusive community 🙌.",
                          position: {
                            start: {
                              line: 1,
                              column: 9603,
                              offset: 9602,
                            },
                            end: {
                              line: 1,
                              column: 9661,
                              offset: 9660,
                            },
                          },
                        },
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [],
                          position: {
                            start: {
                              line: 1,
                              column: 9661,
                              offset: 9660,
                            },
                            end: {
                              line: 1,
                              column: 9668,
                              offset: 9667,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 5902,
                          offset: 5901,
                        },
                        end: {
                          line: 1,
                          column: 9673,
                          offset: 9672,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [
                            {
                              type: 'element',
                              tagName: 'strong',
                              properties: {},
                              children: [
                                {
                                  type: 'text',
                                  value: 'Support',
                                  position: {
                                    start: {
                                      line: 1,
                                      column: 9845,
                                      offset: 9844,
                                    },
                                    end: {
                                      line: 1,
                                      column: 9852,
                                      offset: 9851,
                                    },
                                  },
                                },
                              ],
                              position: {
                                start: {
                                  line: 1,
                                  column: 9784,
                                  offset: 9783,
                                },
                                end: {
                                  line: 1,
                                  column: 9861,
                                  offset: 9860,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 9861,
                                  offset: 9860,
                                },
                                end: {
                                  line: 1,
                                  column: 9940,
                                  offset: 9939,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "Not gonna lie. One of the reasons I join a community is to get a support system. I need people to ask questions, give me feedback, and get mentorships. I need friends with whom I can share my ups and downs and who have the same interest as I do (of course, I'm talking about tech). A supportive community will always get your back.",
                              position: {
                                start: {
                                  line: 1,
                                  column: 9940,
                                  offset: 9939,
                                },
                                end: {
                                  line: 1,
                                  column: 10271,
                                  offset: 10270,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 10271,
                                  offset: 10270,
                                },
                                end: {
                                  line: 1,
                                  column: 10350,
                                  offset: 10349,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                'And because I get that support, I will not only stay but also give back to the community. I contribute and volunteer to support other members with whatever I can.',
                              position: {
                                start: {
                                  line: 1,
                                  column: 10350,
                                  offset: 10349,
                                },
                                end: {
                                  line: 1,
                                  column: 10512,
                                  offset: 10511,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 9722,
                              offset: 9721,
                            },
                            end: {
                              line: 1,
                              column: 10516,
                              offset: 10515,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 9673,
                          offset: 9672,
                        },
                        end: {
                          line: 1,
                          column: 10521,
                          offset: 10520,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [
                            {
                              type: 'element',
                              tagName: 'strong',
                              properties: {},
                              children: [
                                {
                                  type: 'text',
                                  value: 'Size of the community',
                                  position: {
                                    start: {
                                      line: 1,
                                      column: 10693,
                                      offset: 10692,
                                    },
                                    end: {
                                      line: 1,
                                      column: 10714,
                                      offset: 10713,
                                    },
                                  },
                                },
                              ],
                              position: {
                                start: {
                                  line: 1,
                                  column: 10632,
                                  offset: 10631,
                                },
                                end: {
                                  line: 1,
                                  column: 10723,
                                  offset: 10722,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 10723,
                                  offset: 10722,
                                },
                                end: {
                                  line: 1,
                                  column: 10802,
                                  offset: 10801,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "I'm an introverted and shy person. So a huge community is usually overwhelming for me. It takes a lot of work to catch up with the conversations. Also, I often have trouble figuring out where to start. And it would be worse if the community lacked moderators. I usually stay, but more as a quiet passenger.",
                              position: {
                                start: {
                                  line: 1,
                                  column: 10802,
                                  offset: 10801,
                                },
                                end: {
                                  line: 1,
                                  column: 11108,
                                  offset: 11107,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 11108,
                                  offset: 11107,
                                },
                                end: {
                                  line: 1,
                                  column: 11187,
                                  offset: 11186,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                'Small to medium size communities usually are inclusive and more intimate. And I often found myself not only sticking around but also being active in these sizes of communities.',
                              position: {
                                start: {
                                  line: 1,
                                  column: 11187,
                                  offset: 11186,
                                },
                                end: {
                                  line: 1,
                                  column: 11363,
                                  offset: 11362,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 10570,
                              offset: 10569,
                            },
                            end: {
                              line: 1,
                              column: 11367,
                              offset: 11366,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 10521,
                          offset: 10520,
                        },
                        end: {
                          line: 1,
                          column: 11372,
                          offset: 11371,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [
                            {
                              type: 'element',
                              tagName: 'strong',
                              properties: {},
                              children: [
                                {
                                  type: 'text',
                                  value:
                                    'The founder(s), the team, and the volunteers',
                                  position: {
                                    start: {
                                      line: 1,
                                      column: 11544,
                                      offset: 11543,
                                    },
                                    end: {
                                      line: 1,
                                      column: 11588,
                                      offset: 11587,
                                    },
                                  },
                                },
                              ],
                              position: {
                                start: {
                                  line: 1,
                                  column: 11483,
                                  offset: 11482,
                                },
                                end: {
                                  line: 1,
                                  column: 11597,
                                  offset: 11596,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 11597,
                                  offset: 11596,
                                },
                                end: {
                                  line: 1,
                                  column: 11676,
                                  offset: 11675,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "I found myself staying in communities where the founder(s), the team, and the volunteers are actively engaging with the members and know their members. What makes a community great is when all members can interact with the community's core team. In my opinion, that's one thing that makes people feel included.",
                              position: {
                                start: {
                                  line: 1,
                                  column: 11676,
                                  offset: 11675,
                                },
                                end: {
                                  line: 1,
                                  column: 11986,
                                  offset: 11985,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 11421,
                              offset: 11420,
                            },
                            end: {
                              line: 1,
                              column: 11990,
                              offset: 11989,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 11372,
                          offset: 11371,
                        },
                        end: {
                          line: 1,
                          column: 11995,
                          offset: 11994,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'p',
                          properties: {},
                          children: [
                            {
                              type: 'element',
                              tagName: 'strong',
                              properties: {},
                              children: [
                                {
                                  type: 'text',
                                  value: 'Acknowledgement and appreciation',
                                  position: {
                                    start: {
                                      line: 1,
                                      column: 12167,
                                      offset: 12166,
                                    },
                                    end: {
                                      line: 1,
                                      column: 12199,
                                      offset: 12198,
                                    },
                                  },
                                },
                              ],
                              position: {
                                start: {
                                  line: 1,
                                  column: 12106,
                                  offset: 12105,
                                },
                                end: {
                                  line: 1,
                                  column: 12208,
                                  offset: 12207,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 12208,
                                  offset: 12207,
                                },
                                end: {
                                  line: 1,
                                  column: 12287,
                                  offset: 12286,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                'Here is an example. A maintainer in your community approaches you and says, "Hey, I remember you gave an idea about X the other day. We think it sounds great for our community. Will you talk more about it?" The community remembers that you gave the idea, although it\'s already been passed. And they even ask you if you want to talk more about it. Not only do they acknowledge you, but they also appreciate you!',
                              position: {
                                start: {
                                  line: 1,
                                  column: 12287,
                                  offset: 12286,
                                },
                                end: {
                                  line: 1,
                                  column: 12697,
                                  offset: 12696,
                                },
                              },
                            },
                            {
                              type: 'element',
                              tagName: 'br',
                              properties: {},
                              children: [],
                              position: {
                                start: {
                                  line: 1,
                                  column: 12697,
                                  offset: 12696,
                                },
                                end: {
                                  line: 1,
                                  column: 12776,
                                  offset: 12775,
                                },
                              },
                            },
                            {
                              type: 'text',
                              value:
                                "I will definitely stay and give my all when I get such acknowledgment and appreciation in a community. I mean, who doesn't 😀?",
                              position: {
                                start: {
                                  line: 1,
                                  column: 12776,
                                  offset: 12775,
                                },
                                end: {
                                  line: 1,
                                  column: 12902,
                                  offset: 12901,
                                },
                              },
                            },
                          ],
                          position: {
                            start: {
                              line: 1,
                              column: 12044,
                              offset: 12043,
                            },
                            end: {
                              line: 1,
                              column: 12906,
                              offset: 12905,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 11995,
                          offset: 11994,
                        },
                        end: {
                          line: 1,
                          column: 12911,
                          offset: 12910,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 5219,
                      offset: 5218,
                    },
                    end: {
                      line: 1,
                      column: 12916,
                      offset: 12915,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: "Now I'm curious.",
                      position: {
                        start: {
                          line: 1,
                          column: 12988,
                          offset: 12987,
                        },
                        end: {
                          line: 1,
                          column: 13004,
                          offset: 13003,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 12916,
                      offset: 12915,
                    },
                    end: {
                      line: 1,
                      column: 13008,
                      offset: 13007,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value:
                        'What are you looking for in a community when you think of joining?',
                      position: {
                        start: {
                          line: 1,
                          column: 13080,
                          offset: 13079,
                        },
                        end: {
                          line: 1,
                          column: 13146,
                          offset: 13145,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'br',
                      properties: {},
                      children: [],
                      position: {
                        start: {
                          line: 1,
                          column: 13146,
                          offset: 13145,
                        },
                        end: {
                          line: 1,
                          column: 13182,
                          offset: 13181,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value:
                        "And if you're part of a community, what makes you stay? Even better, what about the community that makes you active in engaging and volunteering or contributing?",
                      position: {
                        start: {
                          line: 1,
                          column: 13182,
                          offset: 13181,
                        },
                        end: {
                          line: 1,
                          column: 13343,
                          offset: 13342,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'br',
                      properties: {},
                      children: [],
                      position: {
                        start: {
                          line: 1,
                          column: 13343,
                          offset: 13342,
                        },
                        end: {
                          line: 1,
                          column: 13379,
                          offset: 13378,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value:
                        'I would love to hear from you! Drop your thoughts in the comment below 😀',
                      position: {
                        start: {
                          line: 1,
                          column: 13379,
                          offset: 13378,
                        },
                        end: {
                          line: 1,
                          column: 13452,
                          offset: 13451,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 13008,
                      offset: 13007,
                    },
                    end: {
                      line: 1,
                      column: 13456,
                      offset: 13455,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'hr',
                  properties: {},
                  children: [],
                  position: {
                    start: {
                      line: 1,
                      column: 13456,
                      offset: 13455,
                    },
                    end: {
                      line: 1,
                      column: 13639,
                      offset: 13638,
                    },
                  },
                },
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'Thank you for reading!',
                      position: {
                        start: {
                          line: 1,
                          column: 13711,
                          offset: 13710,
                        },
                        end: {
                          line: 1,
                          column: 13733,
                          offset: 13732,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'br',
                      properties: {},
                      children: [],
                      position: {
                        start: {
                          line: 1,
                          column: 13733,
                          offset: 13732,
                        },
                        end: {
                          line: 1,
                          column: 13769,
                          offset: 13768,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value: 'Last, you can find me on',
                      position: {
                        start: {
                          line: 1,
                          column: 13769,
                          offset: 13768,
                        },
                        end: {
                          line: 1,
                          column: 13793,
                          offset: 13792,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: ' ',
                          position: {
                            start: {
                              line: 1,
                              column: 13829,
                              offset: 13828,
                            },
                            end: {
                              line: 1,
                              column: 13835,
                              offset: 13834,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 13793,
                          offset: 13792,
                        },
                        end: {
                          line: 1,
                          column: 13842,
                          offset: 13841,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'a',
                      properties: {
                        href: 'https://twitter.com/@AdiatiAyu',
                      },
                      children: [
                        {
                          type: 'text',
                          value: 'Twitter',
                          position: {
                            start: {
                              line: 1,
                              column: 13977,
                              offset: 13976,
                            },
                            end: {
                              line: 1,
                              column: 13984,
                              offset: 13983,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 13842,
                          offset: 13841,
                        },
                        end: {
                          line: 1,
                          column: 13988,
                          offset: 13987,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: ' ',
                          position: {
                            start: {
                              line: 1,
                              column: 14024,
                              offset: 14023,
                            },
                            end: {
                              line: 1,
                              column: 14030,
                              offset: 14029,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 13988,
                          offset: 13987,
                        },
                        end: {
                          line: 1,
                          column: 14037,
                          offset: 14036,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value: 'and',
                      position: {
                        start: {
                          line: 1,
                          column: 14037,
                          offset: 14036,
                        },
                        end: {
                          line: 1,
                          column: 14040,
                          offset: 14039,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {},
                      children: [
                        {
                          type: 'text',
                          value: ' ',
                          position: {
                            start: {
                              line: 1,
                              column: 14076,
                              offset: 14075,
                            },
                            end: {
                              line: 1,
                              column: 14082,
                              offset: 14081,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 14040,
                          offset: 14039,
                        },
                        end: {
                          line: 1,
                          column: 14089,
                          offset: 14088,
                        },
                      },
                    },
                    {
                      type: 'element',
                      tagName: 'a',
                      properties: {
                        href: 'https://techhub.social/web/@adiatiayu',
                      },
                      children: [
                        {
                          type: 'text',
                          value: 'Mastodon',
                          position: {
                            start: {
                              line: 1,
                              column: 14231,
                              offset: 14230,
                            },
                            end: {
                              line: 1,
                              column: 14239,
                              offset: 14238,
                            },
                          },
                        },
                      ],
                      position: {
                        start: {
                          line: 1,
                          column: 14089,
                          offset: 14088,
                        },
                        end: {
                          line: 1,
                          column: 14243,
                          offset: 14242,
                        },
                      },
                    },
                    {
                      type: 'text',
                      value: ". Let's connect! 😊",
                      position: {
                        start: {
                          line: 1,
                          column: 14243,
                          offset: 14242,
                        },
                        end: {
                          line: 1,
                          column: 14262,
                          offset: 14261,
                        },
                      },
                    },
                  ],
                  position: {
                    start: {
                      line: 1,
                      column: 13639,
                      offset: 13638,
                    },
                    end: {
                      line: 1,
                      column: 14266,
                      offset: 14265,
                    },
                  },
                },
              ],
              position: {
                start: {
                  line: 1,
                  column: 4191,
                  offset: 4190,
                },
                end: {
                  line: 1,
                  column: 14272,
                  offset: 14271,
                },
              },
            },
          ],
          position: {
            start: {
              line: 1,
              column: 3455,
              offset: 3454,
            },
            end: {
              line: 1,
              column: 14278,
              offset: 14277,
            },
          },
        },
      ],
      data: {
        quirksMode: true,
      },
      position: {
        start: {
          line: 1,
          column: 1,
          offset: 0,
        },
        end: {
          line: 1,
          column: 14278,
          offset: 14277,
        },
      },
    }
    const expected = u('root', [])
    const result = toMttast(hast)
    // expect(result).toEqual(expected)
  })
})
