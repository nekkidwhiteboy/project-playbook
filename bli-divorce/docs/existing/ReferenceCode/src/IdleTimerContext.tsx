import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import api, { AUTH_TOKEN_KEY } from "api";
import axios from "axios";
import {
    CURRENT_USER_KEY,
    useCurrentUser,
    useLogout,
} from "hooks/useCurrentUser";
import { useCallback, useEffect, useRef } from "react";
import {
    IIdleTimer,
    IdleTimerProvider,
    useIdleTimerContext,
} from "react-idle-timer";

const MAX_IDLE_TIME = 3_540_000; // 59 minutes in milliseconds
const IDLE_PROMPT_TIME = 30_000; // 30 seconds in milliseconds

export default function IdleTimerContext({
    children,
}: {
    children: React.ReactNode;
}) {
    const logout = useLogout();

    const onIdle = useCallback(() => {
        Modal.destroyAll();
        logout.mutate();
        Modal.info({
            title: "Session Expired",
            content: (
                <>
                    <p>You have been logged out due to inactivity.</p>
                    <p>Please login again to continue.</p>
                </>
            ),
            onOk: () => Modal.destroyAll(),
        });
    }, [logout]);

    const onPrompt = useCallback(
        (e?: Event, timer?: IIdleTimer) => {
            Modal.confirm({
                title: "Are you still there?",
                content: "You will be logged out shortly due to inactivity.",
                cancelText: "Sign Out",
                okText: "I'm still Here",
                onOk: (close) =>
                    api
                        .get("/auth/users/current/")
                        .then(() => {
                            timer?.start();
                            return timer?.message("reset");
                        })
                        .finally(close),
                onCancel: () => logout.mutateAsync(),
            });
        },
        [logout]
    );

    const onMessage = useCallback((data: any) => {
        if (data === "reset") {
            Modal.destroyAll();
        }
    }, []);

    return (
        <IdleTimerProvider
            events={[]}
            timeout={MAX_IDLE_TIME}
            promptBeforeIdle={IDLE_PROMPT_TIME}
            onPrompt={onPrompt}
            onIdle={onIdle}
            onMessage={onMessage}
            name="api-auth-idle-timer"
            syncTimers={200}
            startManually
            stopOnIdle
            crossTab
            leaderElection
        >
            {children}
            <RefreshOnRequest />
        </IdleTimerProvider>
    );
}

function RefreshOnRequest() {
    const queryClient = useQueryClient();
    const { start, pause } = useIdleTimerContext();
    const { isSuccess: isAuthenticated } = useCurrentUser();
    const idleRefreshRef = useRef<number>();

    useEffect(() => {
        // Insert the refresh-on-request interceptor when the user is authenticated
        if (isAuthenticated) {
            idleRefreshRef.current = api.interceptors.response.use(
                (res) => {
                    // Refresh idle timer when the user makes a successful request to the server.
                    start();
                    return res;
                },
                (error) => {
                    // Log the user out on the client side, if the user is not logged in on the server
                    if (
                        axios.isAxiosError(error) &&
                        error.response?.status === 401
                    ) {
                        pause();
                        window.localStorage.removeItem(AUTH_TOKEN_KEY);
                        queryClient.cancelQueries({
                            queryKey: CURRENT_USER_KEY,
                        });
                        queryClient.invalidateQueries({
                            queryKey: CURRENT_USER_KEY,
                        });
                    }
                    return Promise.reject(error);
                }
            );
        }
        // Eject the refresh-on-request interceptor when the component unmounts or the user is no longer authenticated
        return () => {
            if (idleRefreshRef.current !== undefined) {
                api.interceptors.response.eject(idleRefreshRef.current);
                idleRefreshRef.current = undefined;
                pause();
            }
        };
    }, [start, pause, queryClient, isAuthenticated]);

    useEffect(() => {
        // Watch for a logout in another tab
        const onLocalStorageEvent = (e: StorageEvent) => {
            if (e.key === AUTH_TOKEN_KEY) {
                if (e.newValue === null) {
                    pause();
                    queryClient.cancelQueries({ queryKey: CURRENT_USER_KEY });
                    queryClient.invalidateQueries({
                        queryKey: CURRENT_USER_KEY,
                    });
                }
            }
        };
        // Note: This won't work on the same browsing context that is making the changes
        // It is really a way for other browsing contexts on the domain using the storage to sync any changes that are made.
        window.addEventListener("storage", onLocalStorageEvent, false);
        return () => {
            window.removeEventListener("storage", onLocalStorageEvent);
        };
    }, [queryClient, pause]);

    return null;
}
