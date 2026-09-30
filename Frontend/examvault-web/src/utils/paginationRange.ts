// Windowed page numbers for a pager: always shows page 1 and the last page,
// a few pages around the current one, and an 'ellipsis' marker for any gap -
// instead of one button per page, which becomes an unusable, overflowing
// wall of buttons once a table has enough rows (e.g. Audit Reports with
// 1000+ activities and 50+ pages at 20/page).
export type PaginationItem = number | 'ellipsis';

export function getPaginationRange(current: number, total: number, delta = 2): PaginationItem[] {
  if (total <= 1) return total === 1 ? [1] : [];

  const range: PaginationItem[] = [1];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  if (left > 2) range.push('ellipsis');
  for (let i = left; i <= right; i += 1) range.push(i);
  if (right < total - 1) range.push('ellipsis');

  range.push(total);
  return range;
}
