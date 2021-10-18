import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";
import { PaginationRequest } from "./pagination-request";
import { PaginationResult } from "./pagination-result";

export async function paginate<T>(query: SelectQueryBuilder<T>, parameter: PaginationRequest): Promise<PaginationResult<T>> {
  const page = parameter.page ?? 1;
  const pageSize = parameter.pageSize ?? 10;
  let offset = (page - 1) * pageSize, hasOrder = !!Object.keys(query.expressionMap.orderBys).length;
  const items = await query[hasOrder ? 'offset' : 'skip'](offset)[hasOrder ? 'limit' : 'take'](pageSize).getMany();
  const itemsCount = await query.getCount();

  return {
    page,
    pageSize,
    itemsCount,
    items
  };
}

export {};