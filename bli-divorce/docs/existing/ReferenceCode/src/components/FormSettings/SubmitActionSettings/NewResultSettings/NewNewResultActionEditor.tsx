import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "antd";
import { SelectedFormContext } from "components/SelectedForm";
import { useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateNewResultAction, useNewResultActions } from "./hooks";
import NewResultActionForm from "./NewResultActionForm";
import type { NewResultAction } from "./types";

export function Component() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const selectedForm = useContext(SelectedFormContext);

    const createMutation = useCreateNewResultAction({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useNewResultActions.getPrimaryKey()],
            }),
    });

    const onFinish = useCallback(
        async (values: NewResultAction) => {
            return createMutation
                .mutateAsync({
                    values: {
                        ...values,
                        parent_form: selectedForm.id,
                    },
                })
                .then(() => navigate(-1));
        },
        [navigate, createMutation, selectedForm]
    );

    return (
        <div className="template-set-editor">
            <PageHeader title="Edit" onBack={() => navigate(-1)} />

            <NewResultActionForm onFinish={onFinish} />
        </div>
    );
}
