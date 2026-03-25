import { MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { Button, Divider, Layout, Menu, Popover, Typography } from "antd";
import { useCurrentUser, useLogout } from "hooks/useCurrentUser";
import { useIdleTimer } from "react-idle-timer";
import { Link } from "react-router-dom";
import UserAvatar from "./Users/UserAvatar";
import UserInfoCard from "./Users/UserInfoCard";

import logo from "images/navlogo.png";
import "./MainNav.less";

const MainNav = (): JSX.Element => {
    const { status, data: user } = useCurrentUser();

    return (
        <Layout.Header className="main-nav">
            <div>
                <Link to="/">
                    <img
                        src={logo}
                        alt="Barrow Brown Carrington Logo"
                        height={55}
                    />
                </Link>
                {status === "success" ? (
                    <Popover
                        placement="bottomRight"
                        trigger="click"
                        overlayInnerStyle={{ borderRadius: 5 }}
                        content={<PopoverMenuContent />}
                    >
                        <UserAvatar
                            userId={user.id}
                            size="large"
                            style={{
                                backgroundColor: "lightblue",
                                fontSize: "1.2em",
                                cursor: "pointer",
                            }}
                        />
                    </Popover>
                ) : null}
            </div>
        </Layout.Header>
    );
};

export default MainNav;

function PopoverMenuContent() {
    const { data: user } = useCurrentUser();
    const { pause } = useIdleTimer();
    const logout = useLogout({
        onSettled: () => {
            pause();
        },
    });
    if (!user) {
        return null;
    }
    return (
        <div>
            <UserInfoCard userId={user.id} />
            <Menu
                style={{ border: "none", maxHeight: 250, overflowY: "auto" }}
                items={[
                    {
                        label: "Support",
                        type: "group",
                        children: [
                            {
                                label: (
                                    <Typography.Link
                                        href="mailto:supportteam@bbc.law"
                                        target="_blank"
                                        style={{ color: "inherit" }}
                                    >
                                        supportteam@bbc.law
                                    </Typography.Link>
                                ),
                                key: "email",
                                icon: <MailOutlined />,
                            },
                            {
                                label: (
                                    <Typography.Link
                                        href="tel:+15025899353"
                                        style={{ color: "inherit" }}
                                    >
                                        (502) 589-9353
                                    </Typography.Link>
                                ),
                                key: "phone",
                                icon: <PhoneOutlined />,
                            },
                        ],
                    },
                ]}
            />
            <Divider style={{ margin: "8px 0px" }} />
            <Button type="primary" onClick={() => logout.mutate()} danger block>
                Log Out
            </Button>
        </div>
    );
}
