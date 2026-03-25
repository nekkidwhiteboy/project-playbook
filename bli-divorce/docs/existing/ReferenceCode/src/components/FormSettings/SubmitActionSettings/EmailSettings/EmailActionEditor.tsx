import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "antd";
import api from "api";
import { SelectedFormContext } from "components/SelectedForm";
import { useCallback, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmailActionForm from "./EmailActionForm";
import { useUpdateEmailAction } from "./hooks";
import type { EmailAction } from "./types";

export function Component() {
    const selectedForm = useContext(SelectedFormContext);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const params = useParams();
    const notificationId = parseInt(params.notificationId ?? "0");

    const { data } = useSuspenseQuery({
        queryKey: ["/submit_actions/email", { id: notificationId }],
        queryFn: ({ signal }) =>
            api
                .get<EmailAction>(
                    `/df/submit_actions/email/${notificationId}/`,
                    { signal }
                )
                .then((res) => res.data),
    });

    const updateMutation = useUpdateEmailAction({
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({
                    queryKey: [
                        "/submit_actions/email",
                        { parent_form: selectedForm.id },
                    ],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["/submit_actions/email", { id: data.id }],
                }),
            ]),
    });

    const onFinish = useCallback(
        async (values: EmailAction) =>
            updateMutation
                .mutateAsync({
                    id: data!.id,
                    values,
                })
                .then(() => navigate(-1)),
        [data, updateMutation, navigate]
    );

    return (
        <div>
            <PageHeader title="Edit" onBack={() => navigate(-1)} />
            <EmailActionForm initialValues={data} onFinish={onFinish} />
        </div>
    );
}
Component.displayName = "EmailActionEditor";
