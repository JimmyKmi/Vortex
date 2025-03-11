import {DEFAULT_FOOTER, DEFAULT_FOOTER_LINK} from '@/lib/env'

interface FooterProps {
  footer?: string;
  footerLink?: string;
}

export function Footer({
                         footer = DEFAULT_FOOTER,
                         footerLink = DEFAULT_FOOTER_LINK
                       }: FooterProps) {
  return (
    <footer
      className="bg-blue-950 dark:bg-blue-900 text-white/50 py-1 px-3 z-50 text-sm text-center flex justify-between">
      <p><a href={footerLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{footer}</a></p>
      {/* If you want to build your own version, you are free to remove href, but I wish that you can keep my name.
          如果你希望建立你自己的版本（分支），你可以选择删掉 href，但是我希望你能保留我的名字 */}
      <p>2025 <a href="https://github.com/JimmyKmi/vortex" target="_blank" rel="noopener noreferrer"
                 className="hover:underline">© Designed By JimmyKmi</a></p>
    </footer>
  )
}

