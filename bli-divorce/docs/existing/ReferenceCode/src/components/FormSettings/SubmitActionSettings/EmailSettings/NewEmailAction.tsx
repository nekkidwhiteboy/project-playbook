import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "antd";
import { SelectedFormContext } from "components/SelectedForm";
import { useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import EmailActionForm from "./EmailActionForm";
import { useCreateEmailAction } from "./hooks";
import type { EmailAction } from "./types";

export function Component() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const selectedForm = useContext(SelectedFormContext);

    const createMutation = useCreateEmailAction({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "/submit_actions/email",
                    { parent_form: selectedForm.id },
                ],
            }),
    });

    const onFinish = useCallback(
        async (values: EmailAction) =>
            createMutation
                .mutateAsync({
                    values: {
                        ...values,
                        parent_form: selectedForm.id,
                    },
                })
                .then(() => navigate(-1)),

        [createMutation, navigate, selectedForm]
    );

    return (
        <div>
            <PageHeader title="Create" onBack={() => navigate(-1)} />
            <EmailActionForm onFinish={onFinish} />
        </div>
    );
}
Component.displayName = "NewEmailAction";
