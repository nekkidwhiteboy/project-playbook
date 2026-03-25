import { useQueryClient } from "@tanstack/react-query";
import { Middleware, QueryHook, getKey } from "react-query-kit";

/**
 * React-Query-Kit middleware to set enabled prop based on a dynamic condition.
 * @example {..., use: [enabledIf((data, vars) => !!data?.id)]}
 * @param fn Function that returns if the query should be enabled.
 * @returns React-Query-Kit Middleware
 */
export function enabledIf<R, V, E>(
    fn: (data?: R, vars?: V) => boolean
): Middleware<QueryHook<R, V, E>> {
    return (useQueryNext) => (options) => {
        const client = useQueryClient();
        const key = getKey(options.primaryKey, options.variables);
        return useQueryNext({
            ...options,
            enabled: fn(client.getQueryData(key), options.variables),
        });
    };
}
