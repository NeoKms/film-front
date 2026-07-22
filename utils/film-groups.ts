export const filmGroupCategories = [
  'recommended',
  'franchises',
  'moods',
  'classics',
  'other',
] as const;

export type FilmGroupCategory = (typeof filmGroupCategories)[number];

export const filmGroupCategoryLabels: Record<FilmGroupCategory, string> = {
  recommended: 'Рекомендуем',
  franchises: 'Франшизы и миры',
  moods: 'Настроение и темы',
  classics: 'Классика и награды',
  other: 'Другие',
};

export const filmGroupAccents = [
  'amber',
  'rose',
  'violet',
  'sky',
  'emerald',
  'cyan',
  'orange',
  'red',
] as const;

export type FilmGroupAccent = (typeof filmGroupAccents)[number];

export const filmGroupIcons = [
  'award',
  'biohazard',
  'book-open',
  'brain',
  'cassette-tape',
  'crown',
  'gamepad-2',
  'ghost',
  'gift',
  'heart',
  'history',
  'landmark',
  'layers-3',
  'medal',
  'mountain',
  'music-2',
  'notebook-text',
  'orbit',
  'origami',
  'rocket',
  'shield',
  'siren',
  'smile',
  'trophy',
  'wand-sparkles',
  'zap',
] as const;

export type FilmGroupIcon = (typeof filmGroupIcons)[number];

export interface FilmGroupPresentation {
  category: FilmGroupCategory;
  icon: FilmGroupIcon;
  accent: FilmGroupAccent;
}

export interface PresentableFilmGroup {
  _id: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  category?: FilmGroupCategory;
  icon?: FilmGroupIcon;
  accent?: FilmGroupAccent;
}

interface FilmGroupSelectOption {
  value: string | number;
  label: string;
}

export const filmGroupAccentStyles: Record<
  FilmGroupAccent,
  { card: string; icon: string; chip: string; check: string }
> = {
  amber: {
    card: 'border-amber-300/55 bg-amber-300/[0.09]',
    icon: 'bg-amber-300/15 text-amber-200',
    chip: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    check: 'bg-amber-300 text-zinc-950',
  },
  rose: {
    card: 'border-rose-300/55 bg-rose-300/[0.09]',
    icon: 'bg-rose-300/15 text-rose-200',
    chip: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
    check: 'bg-rose-300 text-zinc-950',
  },
  violet: {
    card: 'border-violet-300/55 bg-violet-300/[0.09]',
    icon: 'bg-violet-300/15 text-violet-200',
    chip: 'border-violet-300/25 bg-violet-300/10 text-violet-100',
    check: 'bg-violet-300 text-zinc-950',
  },
  sky: {
    card: 'border-sky-300/55 bg-sky-300/[0.09]',
    icon: 'bg-sky-300/15 text-sky-200',
    chip: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
    check: 'bg-sky-300 text-zinc-950',
  },
  emerald: {
    card: 'border-emerald-300/55 bg-emerald-300/[0.09]',
    icon: 'bg-emerald-300/15 text-emerald-200',
    chip: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
    check: 'bg-emerald-300 text-zinc-950',
  },
  cyan: {
    card: 'border-cyan-300/55 bg-cyan-300/[0.09]',
    icon: 'bg-cyan-300/15 text-cyan-200',
    chip: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
    check: 'bg-cyan-300 text-zinc-950',
  },
  orange: {
    card: 'border-orange-300/55 bg-orange-300/[0.09]',
    icon: 'bg-orange-300/15 text-orange-200',
    chip: 'border-orange-300/25 bg-orange-300/10 text-orange-100',
    check: 'bg-orange-300 text-zinc-950',
  },
  red: {
    card: 'border-red-300/55 bg-red-300/[0.09]',
    icon: 'bg-red-300/15 text-red-200',
    chip: 'border-red-300/25 bg-red-300/10 text-red-100',
    check: 'bg-red-300 text-zinc-950',
  },
};

export const normalizeFilmGroup = <T extends PresentableFilmGroup>(
  group: T,
): T & FilmGroupPresentation => ({
  ...group,
  category: filmGroupCategories.includes(group.category as FilmGroupCategory)
    ? (group.category as FilmGroupCategory)
    : 'other',
  icon: filmGroupIcons.includes(group.icon as FilmGroupIcon)
    ? (group.icon as FilmGroupIcon)
    : 'layers-3',
  accent: filmGroupAccents.includes(group.accent as FilmGroupAccent)
    ? (group.accent as FilmGroupAccent)
    : 'amber',
});

export const getFilmGroupSections = <T extends PresentableFilmGroup>(
  groups: T[],
  search = '',
) => {
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU');
  const filtered = groups
    .map(normalizeFilmGroup)
    .filter(
      (group) =>
        !normalizedSearch ||
        group.name.toLocaleLowerCase('ru-RU').includes(normalizedSearch) ||
        group.name_en?.toLocaleLowerCase('en-US').includes(normalizedSearch),
    );

  return filmGroupCategories
    .map((category) => ({
      category,
      label: filmGroupCategoryLabels[category],
      items: filtered.filter((group) => group.category === category),
    }))
    .filter(({ items }) => items.length);
};

export const toggleFilmGroupSelection = (
  options: FilmGroupSelectOption[],
  group: Pick<PresentableFilmGroup, '_id' | 'name'>,
): FilmGroupSelectOption[] => {
  const selected = options.some(
    ({ value }) => value.toString() === group._id.toString(),
  );
  return selected
    ? options.filter(({ value }) => value.toString() !== group._id.toString())
    : [...options, { value: group._id, label: group.name }];
};

export const summarizeFilmGroups = <T extends PresentableFilmGroup>(
  groups: T[],
  limit = 3,
) => ({
  visible: groups.map(normalizeFilmGroup).slice(0, limit),
  hiddenCount: Math.max(0, groups.length - limit),
});
