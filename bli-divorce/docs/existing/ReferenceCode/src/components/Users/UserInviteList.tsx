import { DeleteOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
    Breadcrumb,
    Button,
    Card,
    List,
    Modal,
    Segmented,
    Tag,
    Typography,
    message,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { UserInvite } from "./UserInviteForm";
import UserInviteModal from "./UserInviteModal";
import {
    useDeleteUserInvite,
    useSendUserInvite,
    useUserInvites,
} from "./hooks";

import "./Users.less";

const filters: {
    [key: string]: (
        value: UserInvite,
        index: number,
        array: UserInvite[]
    ) => boolean;
} = {
    All: () => true,
    Pending: (invite) => {
        if (invite.accepted_time) {
            return false;
        }
        return !dayjs().isAfter(invite.expiration_time, "minutes");
    },
    Expired: (invite) => {
        if (invite.accepted_time) {
            return false;
        }
        return dayjs().isAfter(invite.expiration_time, "minutes");
    },
};

const UserInviteList = () => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedInvite, setSelectedInvite] = useState<UserInvite>();
    const [selectedFilter, setSelectedFilter] = useState("All");
    const { data, status, pagination } = useUserInvites({ pageSize: 10 });
    return (
        <div>
            <Breadcrumb>
                <Breadcrumb.Item key="home">
                    <Link to="/">Home</Link>
                </Breadcrumb.Item>
                <Breadcrumb.Item key="user-list">
                    <Link to="/users">Users</Link>
                </Breadcrumb.Item>
                <Breadcrumb.Item key="user-invites">
                    <Link to="/users/invites">Invites</Link>
                </Breadcrumb.Item>
            </Breadcrumb>
            <List
                dataSource={data?.filter(filters[selectedFilter])}
                rowKey={(item) => item.id}
                pagination={pagination}
                loading={status === "pending"}
                className="user-list"
                grid={{ column: 2, xs: 1, gutter: 10 }}
                header={
                    <div className="user-list-header">
                        <Segmented
                            options={["All", "Pending", "Expired"]}
                            value={selectedFilter}
                            onChange={(filter) =>
                                setSelectedFilter(filter.toString())
                            }
                        />
                        <Button
                            icon={<PlusOutlined />}
                            type="primary"
                            onClick={() => setShowInviteModal(true)}
                        >
                            New Invite
                        </Button>
                    </div>
                }
                renderItem={(invite) => (
                    <List.Item
                        onClick={() => {
                            setSelectedInvite(invite);
                            setShowInviteModal(true);
                        }}
                    >
                        <UserInviteCard invite={invite} />
                    </List.Item>
                )}
            />
            <UserInviteModal
                open={showInviteModal}
                onOk={() => {
                    setShowInviteModal(false);
                    setSelectedInvite(undefined);
                }}
                onCancel={() => {
                    setShowInviteModal(false);
                    setSelectedInvite(undefined);
                }}
                initialValues={selectedInvite}
            />
        </div>
    );
};
export default UserInviteList;

const UserInviteCard = ({ invite }: { invite: UserInvite }) => {
    const isExpired = dayjs().isAfter(invite.expiration_time, "minutes");

    const queryClient = useQueryClient();
    const sendUserInvite = useSendUserInvite({
        onSuccess: () =>
            queryClient
                .invalidateQueries({
                    queryKey: [useUserInvites.getPrimaryKey()],
                })
                .then(() => message.success("Invite Sent!")),
        onError: (error) => message.error(error.message),
    });
    const deleteUserInvite = useDeleteUserInvite({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useUserInvites.getPrimaryKey()],
            }),
    });

    return (
        <Card className="user-invite-card" type="inner" hoverable>
            <Card.Meta
                title={
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <Typography.Text ellipsis>
                            {invite.email}
                        </Typography.Text>
                        <div
                            className="actions"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                type="text"
                                size="small"
                                icon={<SendOutlined />}
                                title={invite.sent_time ? "Resend" : "Send"}
                                disabled={isExpired}
                                onClick={() =>
                                    sendUserInvite.mutateAsync({
                                        id: invite.id,
                                        resend: !!invite.sent_time,
                                    })
                                }
                            />
                            <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                title="Delete"
                                onClick={() =>
                                    Modal.confirm({
                                        title: "Are you sure?",
                                        content: (
                                            <p>
                                                Are you sure you want to delete
                                                the invitation for "
                                                {invite.email}"? This action{" "}
                                                <strong>cannot</strong> be
                                                undone.
                                            </p>
                                        ),
                                        onOk: () =>
                                            deleteUserInvite.mutateAsync(
                                                invite.id
                                            ),
                                    })
                                }
                            />
                        </div>
                    </div>
                }
                description={
                    <div>
                        <p>
                            Expires:{" "}
                            {invite.expiration_time
                                ? dayjs(invite.expiration_time).format(
                                      "MMMM D, YYYY h:mm A"
                                  )
                                : "Never"}
                        </p>
                        {invite.accepted_time ? (
                            <Tag color="success">Accepted</Tag>
                        ) : isExpired ? (
                            <Tag color="error">Expired</Tag>
                        ) : (
                            <Tag color="processing">Pending</Tag>
                        )}
                        {!invite.sent_time && <Tag color="warning">Unsent</Tag>}
                    </div>
                }
            />
        </Card>
    );
};
