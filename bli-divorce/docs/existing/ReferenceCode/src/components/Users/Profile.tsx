import { useQueryClient } from "@tanstack/react-query";
import { Breadcrumb, Button, PageHeader, Tabs, Tag, Typography } from "antd";
import LoadingIndicator from "components/LoadingIndicator";
import ResultTable from "components/ResultTable";
import { UserRole, useCurrentUser } from "hooks/useCurrentUser";
import { Link, useParams } from "react-router-dom";
import RoleTag from "./RoleTag";
import UserEventList from "./UserEventList";
import { useUpdateUser, useUser } from "./hooks";

const breadcrumb = (
    <Breadcrumb>
        <Breadcrumb.Item key="home">
            <Link to="/">Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item key="user-list">
            <Link to="/users">Users</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item key="user-profile">Profile</Breadcrumb.Item>
    </Breadcrumb>
);

export default function Profile() {
    const queryClient = useQueryClient();
    const params = useParams();
    const userId = parseInt(params.userId ?? "0");
    const { data: userInfo, status } = useUser({ variables: { id: userId } });

    const { data: currentUser, status: currentStatus } = useCurrentUser();

    const updateUser = useUpdateUser({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useUser.getPrimaryKey()],
            }),
    });

    if (status === "pending" || currentStatus === "pending") {
        return <LoadingIndicator />;
    }
    if (status === "error" || currentStatus === "error") {
        return <div>Unable to load user profile!</div>;
    }

    const tags = [];
    if (userInfo?.is_active === false) {
        tags.push(
            <Tag color="grey" key="inactive">
                Inactive
            </Tag>
        );
    }
    tags.push(<RoleTag userRole={userInfo?.role} key="role" />);

    const canChangeUserStatus =
        // Must have at least Admin role
        currentUser.role >= UserRole.Admin &&
        // Can only activate/deactivate users with <= your role
        currentUser.role >= userInfo.role &&
        // Cannot activate/deactivate yourself
        currentUser.id !== userInfo.id;

    const extra = canChangeUserStatus ? (
        userInfo.is_active ? (
            <Button
                onClick={() =>
                    updateUser.mutate({
                        id: userId,
                        user: { is_active: false },
                    })
                }
                danger
            >
                Deactivate
            </Button>
        ) : (
            <Button
                type="primary"
                onClick={() =>
                    updateUser.mutate({
                        id: userId,
                        user: { is_active: true },
                    })
                }
            >
                Reactivate
            </Button>
        )
    ) : null;

    const tabItems = [
        {
            label: "Results",
            key: "results",
            children: <ResultTable owner={userId} />,
        },
    ];
    if (currentUser.role >= UserRole.Admin) {
        tabItems.push({
            label: "Events",
            key: "events",
            children: (
                <Tabs
                    defaultActiveKey="source"
                    tabPosition="left"
                    items={[
                        {
                            label: "Initiated",
                            key: "source",
                            children: <UserEventList source={userId} />,
                        },
                        {
                            label: "Targeted",
                            key: "target",
                            children: <UserEventList target={userId} />,
                        },
                    ]}
                />
            ),
        });
    }

    return (
        <div>
            <PageHeader
                title={
                    <Typography.Text>
                        {userInfo.first_name} {userInfo.last_name}
                    </Typography.Text>
                }
                extra={extra}
                breadcrumb={breadcrumb}
                tags={tags}
                style={{ padding: 0 }}
            >
                <Tabs items={tabItems} />
            </PageHeader>
        </div>
    );
}
