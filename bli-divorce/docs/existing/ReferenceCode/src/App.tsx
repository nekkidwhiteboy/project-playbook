import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import IdleTimerContext from "IdleTimerContext";
import Root from "Root";
import CreateNewResult from "components/CreateNewResult";
import ErrorElement from "components/ErrorElement";
import RequireAuth from "components/RequireAuth";
import Login from "components/auth/Login";
import { lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import {
    Navigate,
    Route,
    RouterProvider,
    createBrowserRouter,
    createRoutesFromElements,
} from "react-router-dom";

import "./App.less";

const DynamicForm = lazy(() => import("components/DynamicForm"));
const FormSettings = lazy(() => import("components/FormSettings"));
const ForgotPassword = lazy(() => import("components/auth/ForgotPassword"));
const HomePage = lazy(() => import("components/HomePage"));
const PrivacyPolicy = lazy(() => import("components/PrivacyPolicy"));
const Register = lazy(() => import("components/auth/Register"));
const ResetPassword = lazy(() => import("components/auth/ResetPassword"));
const ResultManager = lazy(() => import("components/ResultManager"));
const ReviewPage = lazy(() => import("components/DynamicForm/ReviewPage"));
const SuccessPage = lazy(() => import("components/DynamicForm/SuccessPage"));
const SummaryPage = lazy(() => import("components/DynamicForm/SummaryPage"));
const TermsAndConditions = lazy(() => import("components/TermsAndConditions"));
const Users = lazy(() => import("components/Users"));
const Profile = lazy(() => import("components/Users/Profile"));
const UserListPage = lazy(() => import("components/Users/UserListPage"));
const UserInviteList = lazy(() => import("components/Users/UserInviteList"));
const AcceptInvite = lazy(() => import("components/auth/AcceptInvite"));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 10 * (60 * 1000),
        },
    },
});

const router = Sentry.wrapCreateBrowserRouter(createBrowserRouter)(
    createRoutesFromElements(
        <Route path="/" element={<Root />}>
            <Route element={<RequireAuth />} errorElement={<ErrorElement />}>
                <Route index element={<HomePage />} />
                <Route path="new/:slug" element={<CreateNewResult />} />
                <Route
                    path="results"
                    lazy={() =>
                        import("components/DynamicForm/DynamicFormContainer")
                    }
                >
                    <Route path=":resultId">
                        <Route index element={<DynamicForm />} />
                        <Route path="review" element={<ReviewPage />} />
                        <Route path="success" element={<SuccessPage />} />
                        <Route path="summary" element={<RequireAuth staff />}>
                            <Route index element={<SummaryPage />} />
                        </Route>
                    </Route>
                </Route>
            </Route>
            <Route
                element={<RequireAuth staff />}
                errorElement={<ErrorElement />}
            >
                <Route
                    path="forms"
                    id="forms"
                    lazy={async () => {
                        const { Component, getLoader } = await import(
                            "components/StaffDashboard"
                        );
                        return {
                            Component,
                            loader: getLoader(queryClient),
                        };
                    }}
                >
                    <Route
                        path=":formId"
                        lazy={async () => {
                            const { Component, getLoader } = await import(
                                "components/SelectedForm"
                            );
                            return {
                                Component,
                                loader: getLoader(queryClient),
                            };
                        }}
                    >
                        <Route path="results" element={<ResultManager />} />
                        <Route path="settings" element={<FormSettings />}>
                            <Route
                                index
                                element={<Navigate to="general" replace />}
                            />
                            <Route
                                path="general"
                                lazy={() =>
                                    import(
                                        "components/FormSettings/GeneralSettings"
                                    )
                                }
                            />
                            <Route
                                path="templates"
                                lazy={() =>
                                    import(
                                        "components/FormSettings/TemplateSettings/Layout"
                                    )
                                }
                            >
                                <Route
                                    index
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/TemplateSettings/TemplateList"
                                        )
                                    }
                                />
                                <Route
                                    path="new"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/TemplateSettings/NewTemplate"
                                        )
                                    }
                                />
                                <Route
                                    path=":templateId"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/TemplateSettings/TemplateEditor"
                                        )
                                    }
                                />
                            </Route>
                            <Route
                                path="template-sets"
                                lazy={() =>
                                    import(
                                        "components/FormSettings/TemplateSetSettings/Layout"
                                    )
                                }
                            >
                                <Route
                                    index
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/TemplateSetSettings"
                                        )
                                    }
                                />
                                <Route
                                    path="new"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/TemplateSetSettings/NewTemplateSet"
                                        )
                                    }
                                />
                                <Route
                                    path=":setId"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/TemplateSetSettings/TemplateSetEditor"
                                        )
                                    }
                                />
                            </Route>
                            <Route
                                path="new-results"
                                lazy={() =>
                                    import(
                                        "components/FormSettings/SubmitActionSettings/NewResultSettings/Layout"
                                    )
                                }
                            >
                                <Route
                                    index
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/SubmitActionSettings/NewResultSettings"
                                        )
                                    }
                                />
                                <Route
                                    path="new"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/SubmitActionSettings/NewResultSettings/NewNewResultActionEditor"
                                        )
                                    }
                                />
                                <Route
                                    path=":newResultId"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/SubmitActionSettings/NewResultSettings/NewResultActionEditor"
                                        )
                                    }
                                />
                            </Route>
                            <Route
                                path="notifications"
                                lazy={() =>
                                    import(
                                        "components/FormSettings/SubmitActionSettings/EmailSettings/Layout"
                                    )
                                }
                            >
                                <Route
                                    index
                                    lazy={async () => {
                                        const { Component, getLoader } =
                                            await import(
                                                "components/FormSettings/SubmitActionSettings/EmailSettings"
                                            );
                                        return {
                                            Component,
                                            loader: getLoader(queryClient),
                                        };
                                    }}
                                />
                                <Route
                                    path="new"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/SubmitActionSettings/EmailSettings/NewEmailAction"
                                        )
                                    }
                                />
                                <Route
                                    path=":notificationId"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/SubmitActionSettings/EmailSettings/EmailActionEditor"
                                        )
                                    }
                                />
                            </Route>
                            <Route
                                path="webhooks"
                                lazy={() =>
                                    import(
                                        "components/FormSettings/WebhookSettings/Layout"
                                    )
                                }
                            >
                                <Route
                                    index
                                    lazy={async () => {
                                        const { Component, getLoader } =
                                            await import(
                                                "components/FormSettings/WebhookSettings"
                                            );
                                        return {
                                            Component,
                                            loader: getLoader(queryClient),
                                        };
                                    }}
                                />
                                <Route
                                    path="new"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/WebhookSettings/NewWebhookEditor"
                                        )
                                    }
                                />
                                <Route
                                    path=":webhookId"
                                    lazy={() =>
                                        import(
                                            "components/FormSettings/WebhookSettings/WebhookEditor"
                                        )
                                    }
                                />
                            </Route>
                            <Route
                                path="*"
                                element={<Navigate to="general" replace />}
                            />
                        </Route>
                    </Route>
                </Route>
                <Route path="users" element={<Users />}>
                    <Route index element={<UserListPage />} />
                    <Route path="invites" element={<RequireAuth admin />}>
                        <Route index element={<UserInviteList />} />
                    </Route>
                    <Route path=":userId" element={<Profile />} />
                </Route>
            </Route>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot_password" element={<ForgotPassword />} />
            <Route path="reset_password" element={<ResetPassword />} />
            <Route path="accept_invitation" element={<AcceptInvite />} />
            <Route
                path="terms-and-conditions"
                element={<TermsAndConditions />}
            />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
        </Route>
    ),
    {
        future: {
            v7_relativeSplatPath: true,
        },
    }
);
export default function App() {
    return (
        <HelmetProvider>
            <QueryClientProvider client={queryClient}>
                <IdleTimerContext>
                    <RouterProvider
                        router={router}
                        future={{
                            v7_startTransition: true,
                        }}
                    />
                </IdleTimerContext>
                <ReactQueryDevtools />
            </QueryClientProvider>
        </HelmetProvider>
    );
}
