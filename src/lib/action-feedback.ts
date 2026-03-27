export const getSearchParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const buildRedirectPath = (
  pathname: string,
  params: Record<string, string | undefined>
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const search = searchParams.toString();

  return search.length > 0 ? `${pathname}?${search}` : pathname;
};
