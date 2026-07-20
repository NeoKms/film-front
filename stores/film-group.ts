import type { ApiBulkMeta, ApiBulkResponse } from '~/types';
import { toQueryParams } from '~/utils/helpers';

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

  return { groups, groupMeta, getList };
});
