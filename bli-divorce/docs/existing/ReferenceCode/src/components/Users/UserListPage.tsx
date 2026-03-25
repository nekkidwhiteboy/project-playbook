import { Breadcrumb, Input, Select } from "antd";
import { UserRole } from "hooks/useCurrentUser";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useUsers } from "./hooks";
import UserList from "./UserList";

import "./Users.less";

const UserListPage = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useSearchParams();

    const search = query.get("q") ?? undefined;
    const role = (() => {
        const _role = parseInt(query.get("role") || "NaN");
        return isNaN(_role) || _role < UserRole.Client || _role > UserRole.Owner
            ? "All"
            : (_role as UserRole);
    })();

    const { data, status, pagination } = useUsers({
        search,
        role: role === "All" ? undefined : role,
        pageSize: 10,
    });

    return (
        <div>
            <Breadcrumb>
                <Breadcrumb.Item key="home">
                    <Link to="/">Home</Link>
                </Breadcrumb.Item>
                <Breadcrumb.Item key="user-list">
                    <Link to="/users">Users</Link>
                </Breadcrumb.Item>
            </Breadcrumb>
            <UserList
                header={
                    <div className="user-list-header">
                        <Input.Group compact>
                            <Select
                                options={[
                                    { label: "All", value: "All" },
                                    {
                                        label: "Client",
                                        value: UserRole.Client,
                                    },
                                    {
                                        label: "Staff",
                                        value: UserRole.Staff,
                                    },
                                    {
                                        label: "Admin",
                                        value: UserRole.Admin,
                                    },
                                    {
                                        label: "Owner",
                                        value: UserRole.Owner,
                                    },
                                ]}
                                onChange={(value) => {
                                    if (value === "All") {
                                        setQuery((query) => {
                                            query.delete("role");
                                            return Object.fromEntries(query);
                                        });
                                    } else {
                                        setQuery((query) => ({
                                            ...Object.fromEntries(query),
                                            role: value.toString(),
                                        }));
                                    }
                                }}
                                defaultValue={role}
                                dropdownMatchSelectWidth={false}
                            />
                            <Input.Search
                                placeholder="Search Users..."
                                onSearch={(value) => {
                                    if (value === "") {
                                        setQuery((query) => {
                                            query.delete("q");
                                            return Object.fromEntries(query);
                                        });
                                    } else {
                                        setQuery((query) => ({
                                            ...Object.fromEntries(query),
                                            q: value,
                                        }));
                                    }
                                }}
                                defaultValue={search}
                                style={{ maxWidth: 300 }}
                                allowClear
                            />
                        </Input.Group>
                    </div>
                }
                onSelect={(user) => navigate(`${user.id}`)}
                pagination={pagination}
                loading={status === "pending"}
                users={data ?? []}
                style={{ minHeight: 300 }}
            />
        </div>
    );
};

export default UserListPage;
