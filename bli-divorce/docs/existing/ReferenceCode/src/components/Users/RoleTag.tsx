import { Tag, TagProps } from "antd";
import { UserRole } from "hooks/useCurrentUser";

interface Props extends Omit<TagProps, "color"> {
    userRole?: UserRole;
    showClient?: boolean;
}

export default function RoleTag({ userRole, showClient, ...props }: Props) {
    switch (userRole) {
        case UserRole.Owner:
            return (
                <Tag color="gold" {...props}>
                    Owner
                </Tag>
            );
        case UserRole.Admin:
            return (
                <Tag color="green" {...props}>
                    Admin
                </Tag>
            );
        case UserRole.Staff:
            return (
                <Tag color="blue" {...props}>
                    Staff
                </Tag>
            );
        case UserRole.Client:
            if (showClient) {
                return <Tag {...props}>Client</Tag>;
            }
            return null;
        default:
            return null;
    }
}
