import LoadingIndicator from "components/LoadingIndicator";
import { SelectedFormContext } from "components/SelectedForm";
import { Suspense, useContext } from "react";
import { Helmet } from "react-helmet-async";
import { Outlet } from "react-router-dom";

export function Component() {
    const selectedForm = useContext(SelectedFormContext);

    return (
        <div className="main-content">
            <Helmet
                title={`Webhooks | Settings | ${selectedForm.name} | Barrow Brown Carrington, PLLC`}
            />
            <Suspense fallback={<LoadingIndicator />}>
                <Outlet />
            </Suspense>
        </div>
    );
}
Component.displayName = "WebhookSettingsLayout";
