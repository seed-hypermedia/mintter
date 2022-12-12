import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer text-base">
      <div className='wrapper'>
      <nav className="navigation" aria-label="social">
        <ul role="list">
          <li>
            <a href="https://github.com/mintterteam/mintter" target="_blank">
              Github
            </a>
          </li>
          <li>
            <a href="https://discord.gg/mcUnKENdKX" target="_blank">
              Discord
            </a>
          </li>
          <li>
            <a href="https://twitter.com/mintterteam" target="_blank">
              Twitter
            </a>
          </li>
          <li>
            <Link href="/download">
              Download Mintter
            </Link>
          </li>
        </ul>
      </nav>
      </div>
    </footer>
  )
}
