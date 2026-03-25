import { useQuery } from "@tanstack/react-query";
import { PaginationConfig } from "antd/lib/pagination";
import api from "api";
import type { User, UserRole } from "hooks/useCurrentUser";
import { useState } from "react";
import { createMutation, createQuery } from "react-query-kit";
import { getQueryString } from "util/functions";
import { NewUserInvite, UserInvite } from "./UserInviteForm";

export const useUser = createQuery<User, { id: number }>({
    primaryKey: "/users",
    queryFn: ({ queryKey: [primaryKey, vars], signal }) =>
        api
            .get(`/auth${primaryKey}/${vars.id}/`, { signal })
            .then((res) => res.data),
});

const usersPrimaryKey = "/users";

export const useUsers = (
    args: {
        pageSize?: number | "auto";
        search?: string;
        role?: UserRole;
        gcTime?: number;
    } | void
) => {
    const pageSize = args?.pageSize ?? "auto";
    const [pagination, setPagination] = useState<PaginationConfig>({
        current: 1,
        pageSize: pageSize !== "auto" ? pageSize : 1,
        onChange: (current) => setPagination((p) => ({ ...p, current })),
        hideOnSinglePage: true,
    });

    const query = {
        page: pagination.current,
        page_size: pageSize,
        search: !args?.search ? undefined : args.search,
        role: args?.role ?? undefined,
    };
    const usersQuery = useQuery({
        queryKey: [usersPrimaryKey, query],
        queryFn: async ({ signal }) => {
            const response = await api.get<User[]>(
                `/auth/users/?${getQueryString(query)}`,
                { signal }
            );
            if (pageSize === "auto") {
                setPagination((pagination) => ({
                    ...pagination,
                    pageSize: response.data.length,
                    total: response.data.length,
                }));
            } else {
                setPagination((pagination) => ({
                    ...pagination,
                    pageSize: parseInt(
                        response.headers["pagination-page-size"] ?? "25"
                    ),
                    total: parseInt(response.headers["total-count"] ?? "0"),
                }));
            }
            return response.data;
        },
        gcTime: args?.gcTime ?? Infinity,
    });

    return { ...usersQuery, pagination };
};
useUsers.getPrimaryKey = function () {
    return usersPrimaryKey;
};

export const useUpdateUser = createMutation<
    User,
    { id: number; user: Partial<User> }
>({
    mutationFn: async ({ id, user }) =>
        api.patch<User>(`/auth/users/${id}/`, user).then((r) => r.data),
});

const userInvitesPrimaryKey = "/invites";

export const useUserInviteFromToken = createQuery<
    { first_name: string; last_name: string; email: string },
    { token: string | null }
>({
    primaryKey: userInvitesPrimaryKey,
    queryFn: ({ queryKey: [primaryKey, vars] }) =>
        api.post("/auth/invites/verify/", vars).then((r) => r.data),
});

export const useUserInvites = (
    args: {
        pageSize?: number | "auto";
        gcTime?: number;
    } | void
) => {
    const pageSize = args?.pageSize ?? "auto";
    const [pagination, setPagination] = useState<PaginationConfig>({
        current: 1,
        pageSize: pageSize !== "auto" ? pageSize : 1,
        onChange: (current) => setPagination((p) => ({ ...p, current })),
        hideOnSinglePage: true,
    });

    const query = {
        page: pagination.current,
        page_size: pageSize,
    };
    const usersQuery = useQuery({
        queryKey: [userInvitesPrimaryKey, query],
        queryFn: async ({ signal }) => {
            const response = await api.get<UserInvite[]>(
                `/auth/invites/?${getQueryString(query)}`,
                { signal }
            );
            if (pageSize === "auto") {
                setPagination((pagination) => ({
                    ...pagination,
                    pageSize: response.data.length,
                    total: response.data.length,
                }));
            } else {
                setPagination((pagination) => ({
                    ...pagination,
                    pageSize: parseInt(
                        response.headers["pagination-page-size"] ?? "25"
                    ),
                    total: parseInt(response.headers["total-count"] ?? "0"),
                }));
            }
            return response.data;
        },
        gcTime: args?.gcTime ?? Infinity,
    });

    return { ...usersQuery, pagination };
};
useUserInvites.getPrimaryKey = function () {
    return userInvitesPrimaryKey;
};

export const useCreateUserInvite = createMutation<UserInvite, NewUserInvite>({
    mutationFn: async (invite) =>
        api.post(`/auth/invites/`, invite).then((r) => r.data),
});

export const useDeleteUserInvite = createMutation({
    mutationFn: (id: number) => api.delete(`/auth/invites/${id}/`),
});

export const useUpdateUserInvite = createMutation<
    UserInvite,
    { id: number; values: NewUserInvite }
>({
    mutationFn: ({ id, values }) =>
        api.put(`/auth/invites/${id}/`, values).then((r) => r.data),
});

export const useSendUserInvite = createMutation<
    UserInvite,
    { id: number; resend?: boolean }
>({
    mutationFn: ({ id, resend = false }) =>
        api
            .post<UserInvite>(`/auth/invites/${id}/send/`, { resend })
            .then((r) => r.data),
});

export const useAcceptUserInvite = createMutation<
    { user: User; token: string },
    { token: string; first_name: string; last_name: string; password: string }
>({
    mutationFn: (data) =>
        api.post("/auth/invites/accept/", data).then((r) => r.data),
});
