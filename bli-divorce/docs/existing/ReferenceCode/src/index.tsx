import * as Sentry from "@sentry/react";
import React from "react";
import { createRoot } from "react-dom/client";
import {
    createRoutesFromChildren,
    matchRoutes,
    useLocation,
    useNavigationType,
} from "react-router-dom";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

import "./index.less";

Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    tunnel: "/sentry/",
    environment: process.env.REACT_APP_SENTRY_ENV,
    integrations: [
        new Sentry.BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
                React.useEffect,
                useLocation,
                useNavigationType,
                createRoutesFromChildren,
                matchRoutes
            ),
        }),
        new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/portal\.bbc\.law/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend: (event) =>
        process.env.NODE_ENV === "development" ? null : event,
});

const root = createRoot(document.getElementById("root")!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
