export type FindAllResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_page: number;
  };
};
