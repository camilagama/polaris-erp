const getExpectedBearerAuthorization = (
  secret: string | undefined
): string | null => {
  if (!secret) {
    return null;
  }

  return `Bearer ${secret}`;
};

export const isAuthorizedBearerRequest = (
  request: Request,
  secret: string | undefined
): boolean => {
  const expectedAuthorization = getExpectedBearerAuthorization(secret);

  return (
    expectedAuthorization !== null &&
    request.headers.get("authorization") === expectedAuthorization
  );
};
