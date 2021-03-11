import * as React from 'react';
import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';
import { Container } from '@mintter/ui/container';

type Step = {
  title: string;
  url: string;
};

type Props = {
  steps: Step[];
  active: number;
};

export function Steps({ steps, active }: Props) {
  return (
    <Container css={{ p: '$8' }}>
      <Box
        as="ol"
        css={{
          display: 'grid',
          gridTemplateRows: '1fr',
          gridTemplateColumns: '1fr 1fr 1fr',
          '&:before': {
            content: '',
            position: 'absolute',
            width: '100%',
            height: '$4',
            top: 'calc(50% - 2px)',
            left: 0,
          },
          '&:after': {
            content: '',
            display: 'block',
            position: 'absolute',
            left: 0,
            top: 'calc(50% - 2px)',
            transition: '0.5s all ease',
            width: `${active * 50}%`,
            height: 4,
            bc: '$hover',
          },
        }}
      >
        {steps &&
          steps.map((step, index) => (
            <Box
              as="li"
              key={step.title}
              css={{
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Box
                css={{
                  position: 'relative',
                  width: '$4',
                  height: '$4',
                  bc: active >= index ? '$brandPrimary' : '$muted',
                  borderRadius: '$pill',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Text size="1" color={active === index ? 'white' : 'text'}>
                  {active > index ? (
                    <svg
                      width="1em"
                      height="1em"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </Text>
              </Box>
              <Text
                size="1"
                css={{
                  position: 'absolute',
                  top: 28,
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                {step.title}
              </Text>

              {/* <span
                className={`relative w-5 h-5 rounded-full flex items-center justify-center text-muted ${
                  active === index
                    ? 'active text-info-muted'
                    : `bg-transparent ${
                        active > index && 'complete text-info-muted'
                      }`
                } ${css({
                  fontSize: '0.6rem',
                  transition: '0.25s all ease',
                  '&::before': {
                    content: '""',
                    transition: '0.5s background',
                    boxShadow: '0 0 0 3px var(--color-background-muted)',
                    background: 'white',
                    position: 'absolute',
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    borderRadius: '100%',
                    textAlign: 'center',
                    top: 0,
                    zIndex: 10,

                    '.active&': {
                      boxShadow:
                        '0 0 0 3px var(--color-info-hover), 0 0 0 5px var(--color-background)',
                    },
                    '.complete&': {
                      boxShadow:
                        '0 0 0 3px var(--color-info-hover), 0 0 0 5px var(--color-background)',
                      background: 'var(--color-info-hover)',
                    },
                  },
                })}`}
              >
                <span className={`absolute z-10 text-body-muted`}>
                  {active > index ? (
                    <svg
                      width="0.75em"
                      height="0.75em"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
              </span>
              */}
            </Box>
          ))}
      </Box>
      {/* {
        <p className="text-info-hover text-center mt-4 text-xs">
          {steps[active].title}
        </p>
      } */}
    </Container>
  );
}
