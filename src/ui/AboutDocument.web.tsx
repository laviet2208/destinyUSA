export function AboutDocument({ html, title }: { html: string; title: string }) {
  return <iframe title={title} srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', minHeight: 0, flex: 1, border: 0, background: '#FBFAF9' }}/>;
}
