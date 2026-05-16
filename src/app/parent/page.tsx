import { redirect } from 'next/navigation'

/** @deprecated Use `/player` — same account for athlete and family. */
export default function ParentPortalRedirectPage() {
  redirect('/player')
}
