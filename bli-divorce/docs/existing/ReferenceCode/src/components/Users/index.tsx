import { Outlet } from "react-router-dom";

import "./Users.less";

const Users = () => {
    return (
        <div
            className="main-content"
            style={{ maxWidth: 850, overflow: "auto", flex: 1 }}
        >
            <Outlet />
        </div>
    );
};
export default Users;
