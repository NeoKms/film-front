import { describe, expect, test } from 'vitest';
import {
  getFilmGroupSections,
  normalizeFilmGroup,
  summarizeFilmGroups,
  toggleFilmGroupSelection,
} from '../../utils/film-groups';

const groups = [
  {
    _id: 'recommended',
    name: 'Выбор Film Together',
    description: 'Фильмы, которые мы советуем прямо сейчас.',
    category: 'recommended' as const,
    icon: 'crown' as const,
    accent: 'amber' as const,
  },
  {
    _id: 'franchise',
    name: 'Звёздные войны',
    name_en: 'Star Wars',
    category: 'franchises' as const,
    icon: 'orbit' as const,
    accent: 'sky' as const,
  },
  {
    _id: 'mood',
    name: 'Космос зовёт',
    category: 'moods' as const,
    icon: 'rocket' as const,
    accent: 'cyan' as const,
  },
  {
    _id: 'classic',
    name: 'Советская классика',
    category: 'classics' as const,
    icon: 'landmark' as const,
    accent: 'red' as const,
  },
];

describe('film group presentation helpers', () => {
  test('groups the catalog in product order and hides empty sections', () => {
    expect(
      getFilmGroupSections(groups).map(({ category }) => category),
    ).toEqual(['recommended', 'franchises', 'moods', 'classics']);
  });

  test('searches Russian and English names across categories', () => {
    expect(getFilmGroupSections(groups, 'star')[0]?.items[0]?._id).toBe(
      'franchise',
    );
    expect(getFilmGroupSections(groups, 'космос')[0]?.items[0]?._id).toBe(
      'mood',
    );
  });

  test('uses neutral presentation for legacy groups', () => {
    expect(normalizeFilmGroup({ _id: 'legacy', name: 'Legacy' })).toMatchObject(
      {
        category: 'other',
        icon: 'layers-3',
        accent: 'amber',
      },
    );
  });

  test('adds and removes a selection without duplicates', () => {
    const selected = toggleFilmGroupSelection([], groups[1]!);
    expect(selected).toEqual([{ value: 'franchise', label: 'Звёздные войны' }]);
    expect(toggleFilmGroupSelection(selected, groups[1]!)).toEqual([]);
  });

  test('summarizes the waiting room as three visible groups plus a remainder', () => {
    const summary = summarizeFilmGroups(
      [...groups, { _id: 'other', name: 'Ещё одна' }],
      3,
    );
    expect(summary.visible.map(({ _id }) => _id)).toEqual([
      'recommended',
      'franchise',
      'mood',
    ]);
    expect(summary.hiddenCount).toBe(2);
  });
});
