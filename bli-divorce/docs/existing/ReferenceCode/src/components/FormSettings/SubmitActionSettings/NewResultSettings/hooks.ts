import api from "api";
import { createMutation, createQuery } from "react-query-kit";
import { getPaginatedData, getQueryString } from "util/functions";
import { enabledIf } from "util/middleware";
import type { Paginated } from "util/util-types";
import type { NewResultAction } from "./types";

const newResultActionPrimaryKey = "/submit_actions/new_result";

export const useNewResultAction = createQuery<NewResultAction, { id?: number }>(
    {
        primaryKey: newResultActionPrimaryKey,
        queryFn: ({ queryKey: [_, vars], signal }) =>
            api
                .get(`/df/submit_actions/new_result/${vars.id}/`, { signal })
                .then((res) => res.data),
        use: [enabledIf((_, vars) => !!vars?.id)],
    }
);

export const useNewResultActions = createQuery<
    Paginated<NewResultAction>,
    {
        parent_form: number;
        active?: boolean;
        search?: string;
        page?: number;
        page_size?: number | "auto";
    }
>({
    primaryKey: newResultActionPrimaryKey,
    queryFn: async ({ queryKey: [pk, vars], signal }) =>
        getPaginatedData(
            await api.get(
                `/df${pk}/?${getQueryString({
                    page: 1,
                    pagesSize: "auto",
                    ...vars,
                })}`,
                { signal }
            )
        ),
});

export const useUpdateNewResultAction = createMutation({
    mutationFn: (vars: { id: number; values: Partial<NewResultAction> }) => {
        return api.patch<NewResultAction>(
            `/df${useNewResultActions.getPrimaryKey()}/${vars.id}/`,
            vars.values
        );
    },
});

export const useCreateNewResultAction = createMutation({
    mutationFn: (vars: { values: Omit<NewResultAction, "id"> }) => {
        return api.post<NewResultAction>(
            `/df${useNewResultActions.getPrimaryKey()}/`,
            vars.values
        );
    },
});
export const useDeleteNewResultAction = createMutation({
    mutationFn: (vars: { id: number }) =>
        api.delete(`/df${useNewResultActions.getPrimaryKey()}/${vars.id}/`),
});
