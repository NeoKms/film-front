export interface AdminReferenceOption {
  _id: string;
  name: string;
  verified: boolean;
}

interface AdminReferencePage<T> {
  items: T[];
  meta: {
    total: number;
  };
}

interface AdminReferencePagination {
  limit: number;
  offset: number;
}

export const loadAllAdminReferences = async <T>(
  fetchPage: (
    pagination: AdminReferencePagination,
  ) => Promise<AdminReferencePage<T>>,
  limit = 100,
): Promise<T[]> => {
  const items: T[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage({ limit, offset });
    items.push(...page.items);
    offset += page.items.length;

    if (!page.items.length || offset >= page.meta.total) break;
  }

  return items;
};

export const resolveAdminReferenceNames = (
  ids: string[] | undefined,
  options: AdminReferenceOption[],
  unknownLabel: string,
): string[] =>
  (ids ?? []).map(
    (id) => options.find((option) => option._id === id)?.name ?? unknownLabel,
  );
