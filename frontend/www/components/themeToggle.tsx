type Props = {
  isDark: boolean
  toggle: (e: any) => void
}

// Adapted from: https://codepen.io/aaroniker/pen/KGpXZo and https://github.com/narative/gatsby-theme-novela/blob/master/%40narative/gatsby-theme-novela/src/components/Navigation/Navigation.Header.tsx

export default function ThemeToggle({isDark, toggle}: Props) {
  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={isDark ? `Activate Light Mode` : `Activate Dark Mode`}
      title={isDark ? `Activate Light Mode` : `Activate Dark Mode`}
      className="button relative flex items-center justify-center border-none bg-transparent cursor-pointer p-0 appearance-none hover:opacity-100 focus:opacity-100"
    >
      <div
        className={`inner relative rounded-full ${
          isDark
            ? 'border-toggle-theme bg-toggle-theme overflow-visible'
            : 'border-none bg-transparent overflow-hidden shadow-inner'
        }`}
        // boxShadow: t => `0 -23px 0 var(--color-toggle-theme), 0 23px 0 var(--color-toggle-theme), 23px 0 0 var(--color-toggle-theme), -23px 0 0 var(--color-toggle-theme), 15px 15px 0 var(--color-toggle-theme), -15px 15px 0 var(--color-toggle-theme), 15px -15px 0 var(--color-toggle-theme), -15px -15px 0 var(--color-toggle-theme)`,
      />
      <style jsx>{`
        .button {
          opacity: 0.65;
          border-radius: 5px;
          width: 40px;
          height: 25px;
          transition: opacity 0.3s ease;
        }

        .inner {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          transition: all 0.45s ease;
          transform: ${isDark ? 'scale(0.55)' : 'scale(1)'};
          box-shadow: ${isDark
            ? 'none'
            : `inset 8px -8px 0px 0px var(--color-toggle-theme)`};
        }
        .inner:before {
          content: '';
          position: absolute;
          right: -9px;
          top: -9px;
          height: 24px;
          width: 24px;
          border: t =>
            ${isDark ? '2px solid var(--color-toggle-theme)' : 'none'};
          border-radius: 50%;
          transform: ${isDark ? 'translate(14px, -14px)' : 'translate(0, 0)'};
          opacity: ${isDark ? 0 : 1};
          transition: transform 0.45s ease;
        }

        .inner:after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin: -4px 0 0 -4px;
          position: absolute;
          top: 50%;
          left: 50%;
          box-shadow: 0 -23px 0 var(--color-toggle-theme),
            0 23px 0 var(--color-toggle-theme),
            23px 0 0 var(--color-toggle-theme),
            -23px 0 0 var(--color-toggle-theme),
            15px 15px 0 var(--color-toggle-theme),
            -15px 15px 0 var(--color-toggle-theme),
            15px -15px 0 var(--color-toggle-theme),
            -15px -15px 0 var(--color-toggle-theme);
          transform: ${isDark ? 'scale(1)' : 'scale(0)'};
          transition: all 0.35s ease;
        }
      `}</style>
    </button>
  )
}
