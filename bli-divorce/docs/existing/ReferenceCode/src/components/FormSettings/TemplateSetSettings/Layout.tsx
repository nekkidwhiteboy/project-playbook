import { SelectedFormContext } from "components/SelectedForm";
import { useContext } from "react";
import { Helmet } from "react-helmet-async";
import { Outlet } from "react-router-dom";

export function Component() {
    const selectedForm = useContext(SelectedFormContext);

    return (
        <div className="main-content">
            <Helmet
                title={`Template Sets | Settings | ${selectedForm.name} | Barrow Brown Carrington, PLLC`}
            />
            <Outlet />
        </div>
    );
}
Component.displayName = "TemplateSetSettingsLayout";
