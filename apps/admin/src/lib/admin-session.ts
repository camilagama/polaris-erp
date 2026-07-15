const MAXIMUM_ADMIN_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const hasExceededAdminSessionLifetime = (
  createdAt: Date,
  now = new Date()
): boolean =>
  now.getTime() - createdAt.getTime() > MAXIMUM_ADMIN_SESSION_LIFETIME_MS;
