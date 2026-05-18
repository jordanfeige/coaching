export const ADMIN_EMAILS = ['jordan.feige@gmail.com']

export const isAdmin = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email))
