import { Avatar, List, ListProps, Tag, Typography } from "antd";
import { User } from "hooks/useCurrentUser";
import { CSSProperties } from "react";
import RoleTag from "./RoleTag";

import "./Users.less";

interface UserListProps
    extends Omit<ListProps<User>, "dataSource" | "renderItem" | "rowKey"> {
    users: User[];
    onSelect?: (user: User) => void;
    itemStyle?: CSSProperties;
}

const UserList = ({
    users,
    className,
    itemStyle,
    onSelect,
    ...listProps
}: UserListProps) => {
    return (
        <List
            dataSource={users}
            rowKey={(user) => user.id}
            renderItem={(user) => (
                <List.Item
                    onClick={() => onSelect?.(user)}
                    style={{
                        paddingLeft: 10,
                        ...itemStyle,
                    }}
                >
                    <List.Item.Meta
                        avatar={
                            <Avatar>
                                {user.first_name.charAt(0)}
                                {user.last_name.charAt(0)}
                            </Avatar>
                        }
                        title={
                            <div>
                                <Typography.Text style={{ marginRight: 8 }}>
                                    {user.first_name} {user.last_name}
                                </Typography.Text>
                                {!user.is_active ? (
                                    <Tag color="grey">Inactive</Tag>
                                ) : null}
                                <RoleTag userRole={user.role} />
                            </div>
                        }
                        description={
                            <Typography.Link
                                href={`mailto:${user.email}`}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {user.email}
                            </Typography.Link>
                        }
                    />
                </List.Item>
            )}
            className={`user-list ${className ?? ""}`}
            {...listProps}
        />
    );
};

export default UserList;
