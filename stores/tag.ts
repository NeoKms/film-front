import type { ApiBulkMeta, ApiBulkResponse } from '~/types';
import { toQueryParams } from '~/utils/helpers';

export interface TagFilter {
  limit: number;
  offset: number;
  sort?: string;
  search?: string;
  ids?: string[];
}

export interface TagItem {
  _id: string;
  name: string;
}

export const useTagStore = defineStore('tag', () => {
  const wrappedFetch = useWrappedFetch();

  const tags = ref<TagItem[]>([]);
  const tagMeta = ref<ApiBulkMeta>();

  const getList = async (options: TagFilter): Promise<TagItem[]> => {
    const response = await wrappedFetch<ApiBulkResponse<TagItem>>(
      `/tag?${toQueryParams(options)}`,
    );
    tagMeta.value = response.meta;
    tags.value = [...tags.value, ...response.items];
    return response.items;
  };

  return {
    tags,
    tagMeta,
    getList,
  };
});
