interface Props {
  label: string
  value: string
}

export default function EmailInfoRow({ label, value }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #F3F4F6',
        fontSize: 14,
      }}
    >
      <span style={{ color: '#6B7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
