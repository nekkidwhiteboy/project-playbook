import { useQueryClient } from "@tanstack/react-query";
import { type InputRef, PageHeader } from "antd";
import { useTemplate, useUpdateTemplate } from "components/DocxBuilder/hooks";
import type { Template } from "components/DocxBuilder/types";
import LoadingIndicator from "components/LoadingIndicator";
import { useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TemplateForm from "./TemplateForm";

import "../FormSettings.less";

export function Component() {
    const navigate = useNavigate();
    const params = useParams();
    const templateId = parseInt(params.templateId ?? "0");

    const fileRef = useRef<InputRef>(null);
    const queryClient = useQueryClient();

    const { data: template, status: templateStatus } = useTemplate({
        variables: { id: templateId },
    });
    const updateMutation = useUpdateTemplate({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useTemplate.getPrimaryKey()],
            }),
    });
    const onFinish = useCallback(
        async (values: Template) => {
            const extra_fields = JSON.stringify(values.extra_fields ?? []);
            const file = fileRef.current?.input?.files?.[0];
            const _values = {
                ...values,
                extra_fields,
                file: file,
            };

            return updateMutation
                .mutateAsync({ id: templateId, values: _values })
                .then(() => navigate(-1));
        },
        [navigate, templateId, updateMutation]
    );

    return (
        <div className="template-editor">
            <PageHeader title="Edit" onBack={() => navigate(-1)} />
            {templateStatus === "pending" ? (
                <LoadingIndicator />
            ) : templateStatus === "error" ? (
                <p>Unable to load template</p>
            ) : (
                <TemplateForm
                    initialValues={template}
                    onFinish={onFinish}
                    ref={fileRef}
                />
            )}
        </div>
    );
}
Component.displayName = "TemplateEditor";
