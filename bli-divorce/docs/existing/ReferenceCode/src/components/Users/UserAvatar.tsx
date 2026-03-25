import { UserOutlined } from "@ant-design/icons";
import { Avatar, type AvatarProps } from "antd";
import { useUser } from "./hooks";

interface UserAvatarProps extends Omit<AvatarProps, "icon" | "src"> {
    userId: number;
}

const UserAvatar = ({ userId, ...props }: UserAvatarProps) => {
    const { data: user } = useUser({
        variables: { id: userId },
        gcTime: Infinity,
        staleTime: 3_600_000, // 1 hour
    });
    if (user) {
        return (
            <Avatar {...props}>
                {user.first_name.charAt(0)}
                {user.last_name.charAt(0)}
            </Avatar>
        );
    }
    return <Avatar icon={<UserOutlined />} {...props} />;
};
export default UserAvatar;
