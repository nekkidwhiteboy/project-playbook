import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "antd";
import api from "api";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Webhook } from "./types";
import WebhookForm from "./WebhookForm";

export function Component() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const createMutation = useMutation({
        mutationFn: (vars: { values: Omit<Webhook, "id"> }) =>
            api.post("/webhooks/", vars.values),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["/webhooks"],
            }),
    });

    const onFinish = useCallback(
        async (values: Webhook) =>
            createMutation.mutateAsync({ values }).then(() => navigate(-1)),
        [createMutation, navigate]
    );
    return (
        <div>
            <PageHeader title="Edit" onBack={() => navigate(-1)} />
            <WebhookForm onFinish={onFinish} />
        </div>
    );
}
Component.displayName = "NewWebhookEditor";
