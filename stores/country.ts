import type { ApiBulkMeta, ApiBulkResponse } from '~/types';
import { toQueryParams } from '~/utils/helpers';

export interface CountryFilter {
  limit: number;
  offset: number;
  sort?: string;
  search?: string;
  ids?: string[];
}

export interface CountryItem {
  _id: string;
  name: string;
}

export const useCountryStore = defineStore('country', () => {
  const countries = ref<CountryItem[]>([]);
  const countryMeta = ref<ApiBulkMeta>();
  const wrappedFetch = useWrappedFetch();

  const getList = async (options: CountryFilter): Promise<CountryItem[]> => {
    const response = await wrappedFetch<ApiBulkResponse<CountryItem>>(
      `/country?${toQueryParams(options)}`,
    );
    countryMeta.value = response.meta;
    countries.value = [...countries.value, ...response.items];
    return response.items;
  };

  return {
    countries,
    countryMeta,
    getList,
  };
});
