interface Props {
  label: string
  value: string
}

export default function EmailInfoRow({ label, value }: Props) {
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      style={{
        width: '100%',
        padding: '8px 0',
        borderBottom: '1px solid #F3F4F6',
        fontSize: 14,
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              color: '#6B7280',
              whiteSpace: 'nowrap',
              verticalAlign: 'middle',
              paddingRight: 8,
              width: 120,
            }}
          >
            {label}:
          </td>
          <td
            style={{
              color: '#111827',
              fontWeight: 500,
              verticalAlign: 'middle',
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
