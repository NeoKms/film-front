import type { ApiBulkMeta, ApiBulkResponse } from '~/types';
import { toQueryParams } from '~/utils/helpers';
import type {
  FilmGroupAccent,
  FilmGroupCategory,
  FilmGroupIcon,
} from '~/utils/film-groups';

export interface FilmGroupFilter {
  limit: number;
  offset: number;
  sort?: string;
  search?: string;
  ids?: string[];
}

export interface FilmGroupItem {
  _id: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  category?: FilmGroupCategory;
  icon?: FilmGroupIcon;
  accent?: FilmGroupAccent;
}

export const useFilmGroupStore = defineStore('film-group', () => {
  const wrappedFetch = useWrappedFetch();
  const groups = ref<FilmGroupItem[]>([]);
  const groupMeta = ref<ApiBulkMeta>();

  const getList = async (
    options: FilmGroupFilter,
  ): Promise<FilmGroupItem[]> => {
    const response = await wrappedFetch<ApiBulkResponse<FilmGroupItem>>(
      `/film-groups?${toQueryParams(options)}`,
    );
    groupMeta.value = response.meta;
    const merged =
      options.offset === 0
        ? response.items
        : [...groups.value, ...response.items];
    groups.value = Array.from(
      new Map(merged.map((group) => [group._id, group])).values(),
    );
    return response.items;
  };

  const getAll = async (): Promise<FilmGroupItem[]> => {
    const limit = 100;
    let offset = 0;
    let total: number;
    const items: FilmGroupItem[] = [];
    do {
      const response = await wrappedFetch<ApiBulkResponse<FilmGroupItem>>(
        `/film-groups?${toQueryParams({ limit, offset, sort: 'name:asc' })}`,
      );
      items.push(...response.items);
      total = response.meta.total;
      offset += response.items.length;
      if (!response.items.length) break;
    } while (offset < total);

    groups.value = Array.from(
      new Map(items.map((group) => [group._id, group])).values(),
    );
    groupMeta.value = { total, limit, offset: 0 };
    return groups.value;
  };

  const getByIds = async (ids: string[]): Promise<FilmGroupItem[]> => {
    if (!ids.length) return [];
    const response = await wrappedFetch<ApiBulkResponse<FilmGroupItem>>(
      `/film-groups?${toQueryParams({ limit: ids.length, offset: 0, ids })}`,
    );
    return response.items;
  };

  return { groups, groupMeta, getList, getAll, getByIds };
});
