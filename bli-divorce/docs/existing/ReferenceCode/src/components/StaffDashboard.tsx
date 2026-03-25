import { DownOutlined, MenuOutlined } from "@ant-design/icons";
import {
    type FetchQueryOptions,
    type QueryClient,
    useQuery,
} from "@tanstack/react-query";
import { Col, Menu, Row } from "antd";
import api from "api";
import { useCurrentRole } from "hooks/useCurrentUser";
import { useEffect, useState } from "react";
import {
    Link,
    type LoaderFunctionArgs,
    Outlet,
    redirect,
    useLoaderData,
    useLocation,
    useParams,
} from "react-router-dom";
import type { FormInfo } from "./DynamicForm/types";

const formsQuery = (): FetchQueryOptions<FormInfo[]> => ({
    queryKey: ["/df/forms"],
    queryFn: ({ signal }) =>
        api.get("/df/forms/?view=info", { signal }).then((res) => res.data),
    staleTime: Infinity,
    gcTime: Infinity,
});

export const getLoader =
    (queryClient: QueryClient) =>
    async ({ params }: LoaderFunctionArgs) => {
        const data = await queryClient.ensureQueryData(formsQuery());
        if (!params.formId) {
            return redirect(`${data[0].id}/results`);
        }
        return data;
    };

export const Component = () => {
    const location = useLocation();
    const params = useParams();

    const formId = parseInt(params.formId ?? "0");
    const page = location.pathname.split("/").filter((p) => p !== "")[2];
    const trailingPathname = location.pathname.match(
        /(?<=^\/forms\/\d+)(\/.*)/g
    );

    const { isAdmin } = useCurrentRole();

    const [selectedForm, setSelectedForm] = useState<FormInfo>();

    const initialData = useLoaderData() as Awaited<FormInfo[]>;
    const { data: forms } = useQuery({
        ...formsQuery(),
        initialData,
    });

    useEffect(() => {
        if (formId !== 0) {
            setSelectedForm(
                forms.find((form) => form.id === formId) ?? forms[0]
            );
        }
    }, [forms, formId]);

    return (
        <div
            className="main-content"
            style={{ maxWidth: 850, overflow: "auto", flex: 1 }}
        >
            <Row style={{ marginBottom: 5 }}>
                <Col flex="auto">
                    <Menu
                        items={[
                            {
                                label: (
                                    <>
                                        {selectedForm?.name}{" "}
                                        <DownOutlined
                                            style={{
                                                fontSize: 12,
                                                color: "rgba(0,0,0,0.3)",
                                            }}
                                        />
                                    </>
                                ),
                                key: "forms",
                                children: forms?.map((form) => ({
                                    label: (
                                        <Link
                                            to={{
                                                ...location,
                                                pathname: `/forms/${form.id}${trailingPathname}`,
                                            }}
                                        >
                                            {form.name}
                                        </Link>
                                    ),
                                    key: form.id.toString(),
                                })),
                                style: {
                                    color: "#000000",
                                },
                            },
                            {
                                label: (
                                    <Link to={`${formId}/results`}>
                                        Results
                                    </Link>
                                ),
                                key: "results",
                            },
                            {
                                label: (
                                    <Link to={`${formId}/settings`}>
                                        Settings
                                    </Link>
                                ),
                                key: "settings",
                                disabled: !isAdmin,
                            },
                        ]}
                        mode="horizontal"
                        activeKey={page}
                        selectedKeys={[formId.toString()]}
                        overflowedIndicator={
                            <MenuOutlined
                                style={{
                                    fontSize: 22,
                                    verticalAlign: "middle",
                                }}
                            />
                        }
                    />
                </Col>
            </Row>
            <Row>
                <Col flex="auto">
                    <Outlet />
                </Col>
            </Row>
        </div>
    );
};
