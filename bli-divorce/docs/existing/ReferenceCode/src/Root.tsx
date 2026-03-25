import { Layout } from "antd";
import Footer from "components/Footer";
import LoadingIndicator from "components/LoadingIndicator";
import MainNav from "components/MainNav";
import { Suspense } from "react";
import { Outlet, useSearchParams } from "react-router-dom";

export default function Root() {
    const [params] = useSearchParams();
    const headless = params.get("headless") === "true";
    return (
        <Layout className="main-layout">
            {!headless ? <MainNav /> : null}
            <Layout.Content>
                <Suspense fallback={<LoadingIndicator />}>
                    <Outlet />
                </Suspense>
            </Layout.Content>
            {!headless ? <Footer /> : null}
        </Layout>
    );
}
