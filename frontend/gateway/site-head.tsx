import Image from 'next/image'
import Link from 'next/link'
import {BurgerMenu} from './burger-menu'

export function SiteHead() {
  return (
    <header className="site-head" role="banner">
      <div className="wrapper">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="site-head__inner">
          <Link href="/" aria-label="Mintter home">
            <Image
              src="/logo-blue.svg"
              alt="Mintter logo"
              width={136}
              height={48}
            />
          </Link>
          {/* <SiteheadSearch /> */}
          <BurgerMenu>
            <nav className="navigation" aria-label="social">
              <ul role="list">
                <li>
                  <a
                    href="https://github.com/mintterteam/mintter"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Github
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.gg/mcUnKENdKX"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <a
                    href="https://twitter.com/mintterteam"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <Link className="button-cta" href="/download">
                    Download Mintter
                  </Link>
                </li>
              </ul>
            </nav>
          </BurgerMenu>
        </div>
      </div>
    </header>
  )
}
