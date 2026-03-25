import api from "api";
import { isAxiosError } from "axios";
import { createMutation, createQuery } from "react-query-kit";
import { getQueryString } from "util/functions";
import { enabledIf } from "util/middleware";
import {
    ResultStatus,
    type FormInfo,
    type FormPageSchema,
    type FormResult,
    type FormSchema,
    type FormSuccessPageSchema,
    type FormValues,
} from "./types";

export const useResult = createQuery<
    FormResult,
    { id: number; version?: number }
>({
    primaryKey: "/df/results",
    queryFn: ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get(
                `${primaryKey}/${vars.id}/${
                    vars.version ? `?version=${vars.version}` : ""
                }`,
                { signal }
            )
            .then((res) => res.data),
    throwOnError: true,
});

export const useResults = createQuery<FormResult[], { owner?: number }>({
    primaryKey: "/df/results",
    queryFn: ({ queryKey: [primaryKey, params], signal }) =>
        api
            .get(primaryKey + `/?${getQueryString(params)}`, { signal })
            .then((res) => res.data),
});

export const useCreateResult = createMutation({
    mutationFn: ({ owner, form }: { owner: number; form: number }) =>
        api.post<FormResult>("/df/results/", {
            form,
            owner,
        }),
});

export const useDeleteResult = createMutation({
    mutationFn: (vars: { id: number }) => api.delete(`/df/results/${vars.id}/`),
});

export const useResetResult = createMutation({
    mutationFn: (vars: { id: number; version?: number }) =>
        api.post(
            `${useResult.getKey()}/${vars.id}/reset/${
                vars.version ? `?version=${vars.version}` : ""
            }`
        ),
});

export const useSubmitResult = createMutation({
    mutationFn: (vars: { id?: number | string }) =>
        api.post<FormSuccessPageSchema>(
            `${useResult.getPrimaryKey()}/${vars.id}/submit/`
        ),
});

export const useUpdateResultStatus = createMutation({
    mutationFn: (vars: { id?: number | string; status: ResultStatus }) =>
        api.put(`/df/results/${vars.id}/`, {
            result_status: vars.status,
        }),
});

export const useResultPage = createQuery<
    FormResult,
    { id?: number; page: number; persist?: boolean }
>({
    primaryKey: "/df/results",
    queryFn: ({ queryKey, signal }) => {
        const [primaryKey, vars] = queryKey;
        const cached = JSON.parse(
            window.localStorage.getItem(JSON.stringify(queryKey)) ?? "{}"
        ).values;
        if (vars.persist && cached && cached.items) return cached;
        return api
            .get<FormResult>(`${primaryKey}/${vars.id}/?page=${vars.page}`, {
                signal,
            })
            .then((res) => res.data);
    },
    use: [enabledIf((_, vars) => !!vars?.id)],
});

export const useUpdateResultPage = createMutation({
    mutationFn: (vars: {
        id: number;
        page: number;
        values: FormValues;
        partial?: boolean;
    }) =>
        api.put<FormResult>(`${useResultPage.getPrimaryKey()}/${vars.id}/`, {
            page: vars.page,
            items: vars.values,
            partial: !!vars.partial,
        }),
    throwOnError: (error) =>
        !(isAxiosError(error) && error.response?.status === 400),
});

export const useFormInfo = createQuery<FormInfo, { id?: number }>({
    primaryKey: "/df/forms/info",
    queryFn: ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get(`/df/forms/${vars.id}/?view=info`, { signal })
            .then((res) => res.data),
    use: [enabledIf((_, vars) => !!vars?.id)],
    throwOnError: true,
});

export const useFormSchema = createQuery<FormSchema, { id?: number }>({
    primaryKey: "/df/forms",
    queryFn: ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get(`${primaryKey}/${vars.id}/`, { signal })
            .then((res) => res.data),
    use: [enabledIf((_, vars) => !!vars?.id)],
    throwOnError: true,
});

export const useUpdateFormSchema = createMutation({
    mutationFn: (vars: { id: number; values: FormSchema }) =>
        api.patch(`${useFormSchema.getPrimaryKey()}/${vars.id}/`, vars.values),
});

export const useFormPageSchema = createQuery<FormPageSchema, { id: number }>({
    primaryKey: "/df/pages",
    queryFn: ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get(`${primaryKey}/${vars.id}/`, { signal })
            .then((res) => res.data),
    throwOnError: true,
});

export const useFormPages = createQuery<FormPageSchema[], { form?: number }>({
    primaryKey: "/df/pages",
    queryFn: async ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get<FormPageSchema[]>(
                `${primaryKey}/${vars.form ? "?parent_form=" + vars.form : ""}`,
                { signal }
            )
            .then((res) => res.data),
    use: [enabledIf((_, vars) => !!vars?.form)],
});

export const useSuccessPage = createQuery<
    FormSuccessPageSchema,
    { id?: number }
>({
    primaryKey: "/df/pages/success",
    queryFn: ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get(`${primaryKey}/${vars.id}/`, { signal })
            .then((res) => res.data),
    use: [enabledIf((_, vars) => !!vars?.id)],
});

export const useForms = createQuery<FormInfo[], void>({
    primaryKey: "/df/forms",
    queryFn: ({ queryKey: [primaryKey], signal }) =>
        api.get(`${primaryKey}/?view=info`, { signal }).then((res) => res.data),
});
