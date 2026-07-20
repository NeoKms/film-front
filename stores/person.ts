import type { ApiBulkMeta, ApiBulkResponse } from '~/types';
import { toQueryParams } from '~/utils/helpers';

export enum EPersonPosition {
  Directors = 'directors',
  Producers = 'producers',
  Actors = 'actors',
  Scriptwriters = 'scriptwriters',
  Artists = 'artists',
  Operators = 'operators',
  Mounters = 'mounters',
  DubbingActors = 'dubbing actors',
  Composers = 'composers',
}

export interface PersonFilter {
  limit: number;
  offset: number;
  sort?: string;
  search?: string;
  ids?: string[];
  positions?: EPersonPosition[];
}

export interface PersonItem {
  _id: string;
  name: string;
}

export const usePersonStore = defineStore('person', () => {
  const wrappedFetch = useWrappedFetch();

  const persons = ref<PersonItem[]>([]);
  const personMeta = ref<ApiBulkMeta>();

  const getList = async (options: PersonFilter): Promise<PersonItem[]> => {
    const response = await wrappedFetch<ApiBulkResponse<PersonItem>>(
      `/person?${toQueryParams(options)}`,
    );
    personMeta.value = response.meta;
    persons.value = [...persons.value, ...response.items];
    return response.items;
  };

  return {
    persons,
    personMeta,
    getList,
  };
});
