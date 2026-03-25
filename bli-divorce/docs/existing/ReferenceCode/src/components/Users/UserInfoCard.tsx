import { CopyOutlined } from "@ant-design/icons";
import { Button, Card, CardProps, Skeleton, Tooltip, Typography } from "antd";
import { UserRole, useCurrentUser } from "hooks/useCurrentUser";
import { useState } from "react";
import UserAvatar from "./UserAvatar";
import UserRoleBadge from "./UserRoleBadge";
import { useUser } from "./hooks";

interface UserInfoCardProps extends Omit<CardProps, "children" | "type"> {
    userId: number;
    showClientBadge?: boolean;
    showCopyEmailButton?: boolean;
}

const UserInfoCard = ({
    userId,
    showClientBadge,
    showCopyEmailButton,
    style,
    ...props
}: UserInfoCardProps) => {
    const { data: currentUser } = useCurrentUser();
    const [showTooltip, setShowTooltip] = useState(false);

    const { data: user, status } = useUser({
        variables: { id: userId },
        gcTime: Infinity,
        staleTime: 3_600_000, // 1 hour
    });

    if (status === "error") {
        return null;
    }

    return (
        <UserRoleBadge user={user} showClientBadge={showClientBadge}>
            <Card
                {...props}
                style={{
                    backgroundColor: "#fafafa",
                    width: 300,
                    ...style,
                }}
                type="inner"
                onClick={(e) => e.stopPropagation()}
            >
                <Skeleton
                    loading={status === "pending"}
                    title={false}
                    active
                    avatar
                >
                    <Card.Meta
                        title={
                            <Typography.Text ellipsis>
                                {user?.first_name} {user?.last_name}
                                {(currentUser?.role ?? UserRole.Client) >=
                                UserRole.Admin
                                    ? " #" + user?.id
                                    : ""}
                            </Typography.Text>
                        }
                        description={
                            <div style={{ display: "flex" }}>
                                <Typography.Text
                                    ellipsis
                                    style={{ flex: 1 }}
                                    title={user?.email}
                                >
                                    {user?.email}
                                </Typography.Text>
                                {showCopyEmailButton ? (
                                    <Tooltip
                                        title="Copied!"
                                        open={showTooltip}
                                        destroyTooltipOnHide
                                    >
                                        <Button
                                            type="text"
                                            size="small"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    user?.email ?? ""
                                                );
                                                setShowTooltip(true);
                                                setTimeout(
                                                    () => setShowTooltip(false),
                                                    2000
                                                );
                                            }}
                                            aria-label="Copy Email"
                                        >
                                            <CopyOutlined />
                                        </Button>
                                    </Tooltip>
                                ) : null}
                            </div>
                        }
                        avatar={<UserAvatar size="large" userId={userId} />}
                        style={{ alignItems: "center" }}
                    />
                </Skeleton>
            </Card>
        </UserRoleBadge>
    );
};
export default UserInfoCard;
