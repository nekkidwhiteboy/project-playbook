import { useQuery } from "@tanstack/react-query";
import api from "api";
import type { User } from "hooks/useCurrentUser";

export default function UserItem({ value: id }: { value?: number }) {
    const { data, status } = useQuery({
        queryKey: ["users", id],
        queryFn: () =>
            api.get<User>(`auth/users/${id}/`).then((res) => res.data),
        enabled: !!id,
        staleTime: Infinity,
        gcTime: Infinity,
    });
    return (
        <span>
            {status === "pending"
                ? "Loading..."
                : status === "error"
                ? `Unable to load <User id=${id}>`
                : `${data.first_name} ${data.last_name}`}
        </span>
    );
}
