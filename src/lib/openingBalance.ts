import type { BucketKey, MonthlyResult, Scenario, YearMonth } from '../types';
import { assetBucketKey } from '../types';

/**
 * The balance a bucket *enters* `month` with — i.e. the previous month's
 * closing (post-growth) balance, or the raw seed asset total for the very
 * first month. The engine applies that month's own transfers before its own
 * growth, so this is exactly the amount available to a transfer/sale dated
 * in `month`, before that month's activity touches it.
 */
export function computeOpeningBalance(
  scenario: Scenario,
  months: MonthlyResult[],
  month: YearMonth,
  bucket: BucketKey,
): number {
  const index = months.findIndex((m) => m.month === month);
  if (index > 0) return Math.round(months[index - 1].assetBalances[bucket]);
  return scenario.assets.filter((a) => assetBucketKey(a) === bucket).reduce((sum, a) => sum + a.marketValue, 0);
}
