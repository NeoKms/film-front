import { describe, expect, test, vi } from 'vitest';
import {
  isMissingImageUrl,
  mapSettingsToFilmFilter,
  toQueryParams,
} from '../../utils/helpers';
import type { ISettingFilmFilters } from '../../stores/room';

const createSettings = (
  overrides: Partial<ISettingFilmFilters> = {},
): ISettingFilmFilters => ({
  groups: [],
  tags: [],
  tagsMode: 'include',
  countries: [],
  countriesMode: 'include',
  actors: [],
  actorsMode: 'include',
  ratingKp: [1, 10],
  ratingImdb: [1, 10],
  year: [1960, new Date().getFullYear()],
  ageRatings: [],
  mpaaRatings: [],
  ...overrides,
});

describe('isMissingImageUrl', () => {
  test.each([
    undefined,
    null,
    '',
    'https://example.test/no-poster.gif',
    'https://example.test/no_poster.webp?size=large',
  ])('recognizes missing poster URL: %s', (url) => {
    expect(isMissingImageUrl(url)).toBe(true);
  });

  test('keeps a real poster URL', () => {
    expect(isMissingImageUrl('https://example.test/posters/film.jpg')).toBe(
      false,
    );
  });
});

describe('toQueryParams', () => {
  test('serializes arrays, encodes values and omits nullish fields', () => {
    expect(
      toQueryParams({
        search: 'Иван Иванов',
        ids: ['first/id', 'second'],
        verified: false,
        limit: 20,
        skipped: undefined,
        empty: null,
      }),
    ).toBe(
      'search=%D0%98%D0%B2%D0%B0%D0%BD%20%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2&ids=first%2Fid&ids=second&verified=false&limit=20',
    );
  });
});

describe('mapSettingsToFilmFilter', () => {
  test('uses collections as an independent filter', () => {
    const filter = mapSettingsToFilmFilter(
      createSettings({
        groups: [
          { label: 'Оскар', value: 'group-1' },
          { label: 'Канны', value: 2 },
        ],
        tags: [{ label: 'Драма', value: 'tag-1' }],
        year: [2000, 2020],
      }),
    );

    expect(filter).toEqual({ groups: ['group-1', '2'] });
  });

  test('maps include and exclude modes to separate API fields', () => {
    const filter = mapSettingsToFilmFilter(
      createSettings({
        tags: [{ label: 'Драма', value: 'tag-1' }],
        tagsMode: 'exclude',
        countries: [{ label: 'Россия', value: 'country-1' }],
        countriesMode: 'include',
        actors: [{ label: 'Актёр', value: 42 }],
        actorsMode: 'exclude',
      }),
    );

    expect(filter).toMatchObject({
      tags: undefined,
      exclude_tags: ['tag-1'],
      countries: ['country-1'],
      exclude_countries: undefined,
      actors: undefined,
      exclude_actors: ['42'],
    });
  });

  test('omits default ranges and maps changed limits and ratings', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T12:00:00.000Z'));

    expect(
      mapSettingsToFilmFilter(
        createSettings({
          ratingKp: [5, 9],
          ratingImdb: [1, 8],
          year: [1980, 2026],
          ageRatings: [12, 16],
          mpaaRatings: ['PG', 'R'],
        }),
      ),
    ).toMatchObject({
      rating_kp_from: 5,
      rating_kp_to: 9,
      rating_imdb_from: undefined,
      rating_imdb_to: 8,
      year_from: 1980,
      year_to: undefined,
      age_ratings: [12, 16],
      mpaa_ratings: ['PG', 'R'],
    });

    vi.useRealTimers();
  });
});
