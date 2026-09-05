/** Small, dependency-free helpers shared by the data layer and the UI. */

/** Sum a list by a numeric selector. */
export function sumBy<T>(items: readonly T[], select: (item: T) => number): number {
  return items.reduce((total, item) => total + select(item), 0);
}
