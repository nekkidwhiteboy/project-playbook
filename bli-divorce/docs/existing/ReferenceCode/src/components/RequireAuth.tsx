import LoadingIndicator from "components/LoadingIndicator";
import { useLocationWithState } from "hooks/use-location-with-state";
import { UserRole, useCurrentUser } from "hooks/useCurrentUser";
import { Navigate, Outlet } from "react-router-dom";

interface Props {
    staff?: boolean;
    admin?: boolean;
    owner?: boolean;
    role?: UserRole;
}

export default function RequireAuth({ staff }: { staff: boolean }): JSX.Element;
export default function RequireAuth({ admin }: { admin: boolean }): JSX.Element;
export default function RequireAuth({ owner }: { owner: boolean }): JSX.Element;
export default function RequireAuth({ role }: { role?: UserRole }): JSX.Element;
export default function RequireAuth(props: Props): JSX.Element {
    const { status, data } = useCurrentUser();
    const location = useLocationWithState<any>();

    let role = UserRole.Client;
    if (props.staff) {
        role = UserRole.Staff;
    } else if (props.admin) {
        role = UserRole.Admin;
    } else if (props.owner) {
        role = UserRole.Owner;
    } else if (props.role) {
        role = props.role;
    }

    if (status === "pending") {
        return <LoadingIndicator />;
    }

    if (status === "success") {
        if (data.role >= role) {
            return <Outlet />;
        }
        return <Navigate to="/" replace />;
    }

    return (
        <Navigate
            to="/login"
            state={{
                ...location.state,
                from: location.pathname,
            }}
            replace
        />
    );
}
