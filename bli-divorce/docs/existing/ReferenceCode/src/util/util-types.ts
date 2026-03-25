export interface Paginated<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}

export type Unpacked<T> = T extends (infer U)[] ? U : T;
