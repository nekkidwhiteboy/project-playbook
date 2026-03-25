import {
    UseMutationOptions,
    UseQueryOptions,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import api, { AUTH_TOKEN_KEY } from "api";
import { AxiosError } from "axios";
import { useIdleTimerContext } from "react-idle-timer";

export enum UserRole {
    Client = 0,
    Staff = 1,
    Admin = 2,
    Owner = 3,
}

export interface User {
    id: number;
    email: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    is_active: boolean;
}

export const CURRENT_USER_KEY = ["/users", "current"];

export function useCurrentUser(
    options?: Omit<UseQueryOptions<User>, "queryKey" | "queryFn">
) {
    return useQuery({
        staleTime: 10 * 60 * 1000, // 10 minutes
        ...options,
        queryKey: CURRENT_USER_KEY,
        queryFn: async () => {
            if (window.localStorage.getItem(AUTH_TOKEN_KEY)) {
                try {
                    const r = await api.get("/auth/users/current/");
                    return r.data.user;
                } catch (e) {
                    window.localStorage.removeItem(AUTH_TOKEN_KEY);
                    throw e;
                }
            }
            throw new Error("Invalid/missing token");
        },
    });
}

export function useCurrentRole() {
    const { data } = useCurrentUser();

    return {
        isClient: data?.role !== undefined && data.role >= UserRole.Client,
        isStaff: data?.role !== undefined && data.role >= UserRole.Staff,
        isAdmin: data?.role !== undefined && data.role >= UserRole.Admin,
        isOwner: data?.role !== undefined && data.role === UserRole.Owner,
        role: data?.role,
    };
}

interface LoginData {
    username: string;
    password: string;
}
interface LoginResponse {
    user: User;
    token: string;
}
export function useLogin(
    options?: Omit<
        UseMutationOptions<LoginResponse, AxiosError<any>, LoginData>,
        "mutationFn"
    >
) {
    const queryClient = useQueryClient();
    const idleTimerContext = useIdleTimerContext();

    return useMutation({
        ...options,
        mutationFn: (data: LoginData) => {
            if (!window.localStorage.getItem(AUTH_TOKEN_KEY)) {
                return api.post("/auth/login/", data).then((r) => r.data);
            }
            throw new Error("A user is already signed in");
        },
        onSuccess: (data, ...rest) => {
            window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            queryClient.setQueryData(CURRENT_USER_KEY, data.user);
            idleTimerContext.message("reset");
            return options?.onSuccess?.(data, ...rest);
        },
    });
}

export function useLogout(
    options?: Omit<UseMutationOptions<void, AxiosError<any>, void>, "mutateFn">
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: () => api.post("/auth/logout/").then(() => {}),
        onSettled: (...args) => {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            queryClient.cancelQueries({ queryKey: CURRENT_USER_KEY });
            queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
            return options?.onSettled?.(...args);
        },
    });
}
interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}
type RegisterErrors = {
    email?: string[];
    password?: string[];
};
export function useRegister(
    options?: Omit<
        UseMutationOptions<
            LoginResponse,
            AxiosError<RegisterErrors>,
            RegisterData
        >,
        "mutateFn"
    >
) {
    const queryClient = useQueryClient();

    return useMutation({
        ...options,
        mutationFn: (data) => {
            if (!window.localStorage.getItem(AUTH_TOKEN_KEY)) {
                return api.post("/auth/register/", data).then((r) => r.data);
            }
            throw new Error("Cannot register while a user is logged in");
        },
        onSuccess: (data, ...rest) => {
            window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            queryClient.setQueryData(CURRENT_USER_KEY, data.user);
            return options?.onSuccess?.(data, ...rest);
        },
    });
}
