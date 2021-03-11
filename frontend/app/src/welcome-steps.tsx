import * as React from 'react';

type Step = {
  title: string;
  url: string;
};

type Props = {
  steps: Step[];
  active: number;
};

export default function Steps({ steps, active }: Props) {
  return (
    <div>
      <ol>
        {steps &&
          steps.map((step, index) => (
            <li key={step.title}>
              <span>
                <span>
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
              <span>{step.title}</span>
            </li>
          ))}
      </ol>
      {/* {
        <p className="text-info-hover text-center mt-4 text-xs">
          {steps[active].title}
        </p>
      } */}
    </div>
  );
}
