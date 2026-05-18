interface Props {
  href: string
  children: React.ReactNode
  secondary?: boolean
}

export default function EmailButton({ href, children, secondary }: Props) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        background: secondary ? 'transparent' : '#2D9B7F',
        color: secondary ? '#2D9B7F' : '#FFFFFF',
        padding: '12px 24px',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        textDecoration: 'none',
        border: secondary ? '1px solid #2D9B7F' : 'none',
        margin: '8px 0',
      }}
    >
      {children}
    </a>
  )
}
