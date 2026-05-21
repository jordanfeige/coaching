import { redirect } from 'next/navigation'

/** Recruiting lives on Journey — keep old URL working. */
export default function PlayerRecruitingRedirect() {
  redirect('/player/journey')
}
