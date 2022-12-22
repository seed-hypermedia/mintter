import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer text-base">
      <div className="wrapper">
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
              <Link href="/download">Download Mintter</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
