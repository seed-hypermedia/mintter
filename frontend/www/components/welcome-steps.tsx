import {css} from 'emotion'

type Step = {
  title: string
  url: string
}

type Props = {
  steps: Step[]
  active: number
}

export default function Steps({steps, active}: Props) {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 sm:mb-8 py-8 px-16">
      <ol
        className={`flex w-full items-center justify-between relative ${css({
          '&::before': {
            content: '""',
            position: 'absolute',
            width: '100%',
            height: 4,
            backgroundColor: 'var(--color-muted)',
            top: 'calc(50% - 2px)',
            left: 0,
            //   zIndex: -1,
          },
          '&::after': {
            content: '""',
            display: 'block',
            position: 'absolute',
            left: 0,
            top: 'calc(50% - 2px)',
            transition: '0.5s all ease',
            width: `${active * 33}%`,
            height: 4,
            backgroundColor: 'var(--color-info-hover)',
            //   zIndex: -1,
          },
        })}`}
      >
        {steps &&
          steps.map((step, index) => (
            <li key={step.title} className="flex flex-col relative">
              <span
                className={`relative w-5 h-5 rounded-full flex items-center justify-center text-muted ${
                  active === index
                    ? 'active text-info-muted'
                    : `bg-transparent ${active > index &&
                        'complete text-info-muted'}`
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
                      width="0.75rem"
                      height="0.75rem"
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
              <span
                className={`absolute w-full text-center whitespace-no-wrap text-xs opacity-0 sm:opacity-100 ${css`
                  @media (min-width: 480px) {
                    transform: translateX(-40px);
                    width: 100px;
                    top: 28px;
                    left: 0;
                    transition: 0.25s all ease;
                  }
                  color: ${active === index
                    ? 'var(--color-info-hover)'
                    : 'var(--color-body-muted)'};
                `}`}
              >
                {step.title}
              </span>
            </li>
          ))}
      </ol>
      {/* {
        <p className="text-info-hover text-center mt-4 text-xs">
          {steps[active].title}
        </p>
      } */}
    </div>
  )
}
