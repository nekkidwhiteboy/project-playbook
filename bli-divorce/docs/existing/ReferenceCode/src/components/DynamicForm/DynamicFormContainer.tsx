import api from "api";
import { ActionFunction, Outlet, redirect } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import type { FormResult } from "./types";

export const Component = () => (
    <div className="form-container">
        <div className="pre-form-container" />
        <div className="main-content">
            <ErrorBoundary>
                <Outlet />
            </ErrorBoundary>
        </div>
        <div className="post-form-container" />
    </div>
);
Component.displayName = "DynamicFormContainer";

export const action: ActionFunction = async ({ request }) => {
    return api
        .post<FormResult>("/df/results/", await request.json())
        .then((r) => r.data)
        .then(({ id }) => redirect(`/results/${id}`))
        .catch(() => redirect("/"));
};
