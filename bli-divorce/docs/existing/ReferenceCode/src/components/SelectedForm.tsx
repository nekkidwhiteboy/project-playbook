import {
    type FetchQueryOptions,
    type QueryClient,
    useQuery,
} from "@tanstack/react-query";
import api from "api";
import { createContext } from "react";
import {
    json,
    type LoaderFunctionArgs,
    Outlet,
    useLoaderData,
    useParams,
} from "react-router-dom";
import { tryCatch } from "util/functions";
import type { FormSchema } from "./DynamicForm/types";

export const formQuery = (id: number): FetchQueryOptions<FormSchema> => ({
    queryKey: ["/df/forms", { id }],
    queryFn: ({ signal }) =>
        api.get(`/df/forms/${id}/`, { signal }).then((res) => res.data),
});
export const getLoader =
    (queryClient: QueryClient) =>
    ({ params }: LoaderFunctionArgs) => {
        const id = tryCatch(() => parseInt(params.formId!), null);

        if (!id || id <= 0) {
            throw json("Not Found", { status: 404, statusText: "Not Found" });
        }
        return queryClient.ensureQueryData(formQuery(id));
    };

export const SelectedFormContext = createContext<FormSchema>({} as FormSchema);

export const Component = () => {
    const params = useParams();
    const formId = parseInt(params.formId!);

    const initialData = useLoaderData() as Awaited<FormSchema>;
    const { data } = useQuery({
        ...formQuery(formId),
        initialData,
    });
    return (
        <SelectedFormContext.Provider value={data}>
            <Outlet />
        </SelectedFormContext.Provider>
    );
};
