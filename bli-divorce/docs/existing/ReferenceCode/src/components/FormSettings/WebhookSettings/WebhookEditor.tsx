import {
    useMutation,
    useQueryClient,
    useSuspenseQuery,
} from "@tanstack/react-query";
import { PageHeader } from "antd";
import api from "api";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Webhook } from "./types";
import WebhookForm from "./WebhookForm";

export function Component() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const params = useParams();
    const webhookId = parseInt(params.webhookId ?? "0");

    const { data } = useSuspenseQuery({
        queryKey: ["/webhooks", { id: webhookId }],
        queryFn: ({ signal }) =>
            api
                .get<Webhook>(`/webhooks/${webhookId}/`, { signal })
                .then((res) => res.data),
    });

    const updateMutation = useMutation({
        mutationFn: (vars: { id: number; values: Partial<Webhook> }) =>
            api.patch(`/webhooks/${vars.id}/`, vars.values),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["/webhooks"],
            }),
    });

    const onFinish = useCallback(
        async (values: Webhook) =>
            updateMutation
                .mutateAsync({
                    id: data.id,
                    values,
                })
                .then(() => navigate(-1)),
        [data, updateMutation, navigate]
    );
    return (
        <div>
            <PageHeader title="Edit" onBack={() => navigate(-1)} />
            <WebhookForm initialData={data} onFinish={onFinish} />
        </div>
    );
}
Component.displayName = "WebhookEditor";
