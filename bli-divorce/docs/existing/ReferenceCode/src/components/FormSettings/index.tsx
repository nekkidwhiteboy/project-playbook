import {
    ApiOutlined,
    DeploymentUnitOutlined,
    ExportOutlined,
    FileAddOutlined,
    FileWordOutlined,
    FolderOutlined,
    MailOutlined,
    PlusOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import ErrorBoundary from "components/DynamicForm/ErrorBoundary";
import { Link, Outlet } from "react-router-dom";

import "./FormSettings.less";

export default function FormSettings() {
    return (
        <Layout className="form-settings-layout">
            <Layout>
                <Layout.Sider
                    collapsible
                    breakpoint="md"
                    collapsedWidth={50}
                    theme="light"
                >
                    <Menu
                        items={[
                            {
                                label: <Link to="general">General</Link>,
                                icon: <SettingOutlined />,
                                key: "general",
                            },
                            {
                                label: "Document Generation",
                                icon: <FileAddOutlined />,
                                key: "generation",
                                children: [
                                    {
                                        label: (
                                            <Link to="template-sets">
                                                Template Sets
                                            </Link>
                                        ),
                                        icon: <FolderOutlined />,
                                        key: "template_sets",
                                    },
                                    {
                                        label: (
                                            <Link to="templates">
                                                Templates
                                            </Link>
                                        ),
                                        icon: <FileWordOutlined />,
                                        key: "templates",
                                    },
                                ],
                            },
                            {
                                label: "Submit Actions",
                                icon: <ExportOutlined />,
                                key: "submit_actions",
                                children: [
                                    {
                                        label: (
                                            <Link to="new-results">
                                                New Results
                                            </Link>
                                        ),
                                        icon: <PlusOutlined />,
                                        key: "new_results",
                                    },
                                    {
                                        label: (
                                            <Link to="notifications">
                                                Notifications
                                            </Link>
                                        ),
                                        icon: <MailOutlined />,
                                        key: "notifications",
                                    },
                                ],
                            },
                            {
                                label: "API",
                                icon: <ApiOutlined />,
                                key: "api",
                                children: [
                                    {
                                        label: (
                                            <Link to="webhooks">Webhooks</Link>
                                        ),
                                        icon: <DeploymentUnitOutlined />,
                                        key: "webhooks",
                                    },
                                ],
                            },
                        ]}
                        defaultOpenKeys={[
                            "generation",
                            "submit_actions",
                            "api",
                        ]}
                        mode="inline"
                    />
                </Layout.Sider>
                <Layout.Content>
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </Layout.Content>
            </Layout>
        </Layout>
    );
}
