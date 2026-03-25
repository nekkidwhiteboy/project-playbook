import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "antd";
import LoadingIndicator from "components/LoadingIndicator";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    useNewResultAction,
    useNewResultActions,
    useUpdateNewResultAction,
} from "./hooks";
import NewResultActionForm from "./NewResultActionForm";
import type { NewResultAction } from "./types";

export function Component() {
    const navigate = useNavigate();
    const params = useParams();
    const newResultId = parseInt(params.newResultId ?? "0");
    const queryClient = useQueryClient();

    const { data, status } = useNewResultAction({
        variables: { id: newResultId },
    });

    const updateMutation = useUpdateNewResultAction({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useNewResultActions.getPrimaryKey()],
            }),
    });

    const onFinish = useCallback(
        async (values: NewResultAction) => {
            return updateMutation
                .mutateAsync({
                    id: newResultId,
                    values,
                })
                .then(() => navigate(-1));
        },
        [newResultId, navigate, updateMutation]
    );

    return (
        <div className="template-set-editor">
            <PageHeader title="Edit" onBack={() => navigate(-1)} />
            {status === "pending" ? (
                <LoadingIndicator />
            ) : status === "error" ? (
                <p>Unable to load action</p>
            ) : (
                <NewResultActionForm initialValues={data} onFinish={onFinish} />
            )}
        </div>
    );
}
