export const parsePagination = (query, defaults = { limit: 50, max: 100 }) => {
  const rawLimit = Number.parseInt(query.limit, 10);
  const rawOffset = Number.parseInt(query.offset, 10);

  const limit = Math.min(
    Math.max(Number.isNaN(rawLimit) ? defaults.limit : rawLimit, 1),
    defaults.max,
  );
  const offset = Math.max(Number.isNaN(rawOffset) ? 0 : rawOffset, 0);

  return { limit, offset };
};
