import {NEXT_PUBLIC_FOOTER, NEXT_PUBLIC_FOOTER_LINK} from '@/lib/config/env'

export function Footer() {
  function getFooterLink() {
    const footerLinkStr = NEXT_PUBLIC_FOOTER_LINK;
    const parts = footerLinkStr.includes('|') ? footerLinkStr.split('|') : [footerLinkStr, ''];
    return parts.length >= 2 ? parts : ['', ''];
  }
  const [text, url] = getFooterLink();
  return (
    <footer
      className="bg-blue-950 dark:bg-blue-900 text-white/50 py-1 px-3 z-50 text-sm text-center border-t border-border flex justify-between select-none">
      <p>
        {NEXT_PUBLIC_FOOTER}
        {url && (
          <>
            &nbsp; | &nbsp;
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {text}
            </a>
          </>
        )}
      </p>
      {/* You can free to remove href, but I wish that you can keep my name.
          你可以删掉 href，但是我希望你能保留我的名字 */}
      <p>2025 <a href="https://github.com/JimmyKmi/jimmy-file" target="_blank" rel="noopener noreferrer"
                 className="hover:underline">© Designed By JimmyKmi</a></p>
    </footer>
  )
}

