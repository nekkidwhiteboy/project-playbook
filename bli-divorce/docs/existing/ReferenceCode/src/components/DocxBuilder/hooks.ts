import api from "api";
import { createMutation, createQuery } from "react-query-kit";
import { getPaginatedData, getQueryString } from "util/functions";
import { enabledIf } from "util/middleware";
import type { Paginated } from "util/util-types";
import type { Template, TemplateInfo, TemplateSet } from "./types";

const templatePrimaryKey = "/docxbuilder/templates";

export const useTemplate = createQuery<Template, { id: number }>({
    primaryKey: templatePrimaryKey,
    queryFn: ({ queryKey: [, vars], signal }) =>
        api
            .get(`/docxbuilder/templates/${vars.id}/`, { signal })
            .then((res) => res.data),
    use: [enabledIf((_, vars) => (vars?.id ?? 0) > 0)],
});

export const useTemplates = createQuery<
    Paginated<TemplateInfo>,
    { search?: string; page?: number; page_size?: number | "auto" }
>({
    primaryKey: templatePrimaryKey,
    queryFn: async ({ queryKey: [, vars], signal }) =>
        getPaginatedData(
            await api.get<TemplateInfo[]>(
                `/docxbuilder/templates/?${getQueryString({
                    page: 1,
                    pageSize: "auto",
                    ...vars,
                })}`,
                { signal }
            )
        ),
});

export const useCreateTemplate = createMutation({
    mutationFn: (vars: { values: any }) =>
        api.postForm<Template>(`${useTemplates.getPrimaryKey()}/`, vars.values),
});

export const useDeleteTemplate = createMutation({
    mutationFn: (id: number) =>
        api.delete<void>(`${useTemplates.getPrimaryKey()}/${id}/`),
});

export const useUpdateTemplate = createMutation({
    mutationFn: (vars: { id: number; values: any }) =>
        api.patch<Template>(
            `${useTemplates.getPrimaryKey()}/${vars.id}/`,
            vars.values,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                formSerializer: {
                    dots: true,
                },
            }
        ),
});

export const useTemplateUrl = createQuery<
    { url: string; expires_in: number },
    { id: number }
>({
    primaryKey: "/docxbuilder/templates/url",
    queryFn: ({ queryKey: [pk, vars], meta, signal }) =>
        api
            .get(
                `/docxbuilder/templates/${vars.id}/url/${
                    meta?.staleTime ? "?expires_in=" + meta.staleTime : ""
                }`,
                { signal }
            )
            .then((res) => res.data),
    use: [enabledIf((_, vars) => (vars?.id ?? 0) > 0)],
});

export const useTemplateFields = createQuery<
    { used_fields: string[] },
    { id: number }
>({
    primaryKey: "/docxbuilder/templates/fields",
    queryFn: ({ queryKey: [pk, vars], signal }) =>
        api
            .get(`/docxbuilder/templates/${vars.id}/used_fields/`, { signal })
            .then((res) => res.data),
    use: [enabledIf((_, vars) => (vars?.id ?? 0) > 0)],
});

const templateSetPrimaryKey = "/docxbuilder/sets";

export const useTemplateSet = createQuery<TemplateSet, { id: number }>({
    primaryKey: templateSetPrimaryKey,
    queryFn: ({ queryKey: [, vars], signal }) =>
        api
            .get(`/docxbuilder/sets/${vars.id}/?detail=true`, { signal })
            .then((res) => res.data),
    use: [enabledIf((_, vars) => (vars?.id ?? 0) > 0)],
});

export const useTemplateSets = createQuery<
    Paginated<TemplateSet>,
    {
        form?: number;
        search?: string;
        page?: number;
        page_size?: number | "auto";
    }
>({
    primaryKey: templateSetPrimaryKey,
    queryFn: async ({ queryKey: [, vars], signal }) =>
        getPaginatedData(
            await api.get<TemplateSet[]>(
                `/docxbuilder/sets/?${getQueryString({
                    page: 1,
                    pageSize: "auto",
                    ...vars,
                    detail: true,
                })}`,
                { signal }
            )
        ),
    use: [enabledIf((_, vars) => (vars?.form ?? 0) > 0)],
});

export const useCreateTemplateSet = createMutation({
    mutationFn: (vars: { values: any }) =>
        api.post(useTemplateSets.getPrimaryKey() + "/", vars.values),
});

export const useDeleteTemplateSet = createMutation({
    mutationFn: (vars: { id: number }) =>
        api.delete(`${useTemplateSets.getPrimaryKey()}/${vars.id}/`),
});

export const useUpdateTemplateSet = createMutation({
    mutationFn: (vars: { id: number; values: any }) =>
        api.patch(
            `${useTemplateSets.getPrimaryKey()}/${vars.id}/`,
            vars.values
        ),
});
