import { Badge } from "antd";
import type { RibbonProps } from "antd/lib/badge/Ribbon";
import { UserRole, type User } from "hooks/useCurrentUser";

interface Props extends Omit<RibbonProps, "text" | "color"> {
    color?: string | "auto";
    user?: User;
    showClientBadge?: boolean;
}

const UserRoleBadge = ({
    user,
    color = "auto",
    showClientBadge = false,
    ...props
}: Props) => {
    if (user && (showClientBadge || user.role > UserRole.Client)) {
        return (
            <Badge.Ribbon
                {...props}
                text={UserRole[user.role]}
                color={color === "auto" ? getRoleColor(user.role) : color}
            />
        );
    }
    return <>{props.children}</>;
};
export default UserRoleBadge;

export function getRoleColor(role: UserRole): string {
    switch (role) {
        case UserRole.Owner:
            return "gold";
        case UserRole.Admin:
            return "green";
        case UserRole.Staff:
            return "blue";
        default:
            return "grey";
    }
}
