import { describe, expect, it } from 'vitest';
import { INDEXABLE_ROUTES, isIndexablePath } from '../../utils/seo';

describe('public SEO routes', () => {
  it('includes the cooperation page in the shared indexable allowlist', () => {
    expect(INDEXABLE_ROUTES).toContain('/cooperation');
    expect(isIndexablePath('/cooperation')).toBe(true);
  });
});
