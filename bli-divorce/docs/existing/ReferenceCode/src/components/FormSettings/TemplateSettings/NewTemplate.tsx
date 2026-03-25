import { useQueryClient } from "@tanstack/react-query";
import { type InputRef, PageHeader } from "antd";
import { useCreateTemplate, useTemplates } from "components/DocxBuilder/hooks";
import type { Template } from "components/DocxBuilder/types";
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TemplateForm from "./TemplateForm";

import "../FormSettings.less";

export function Component() {
    const navigate = useNavigate();

    const fileRef = useRef<InputRef>(null);
    const queryClient = useQueryClient();

    const createMutation = useCreateTemplate({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useTemplates.getPrimaryKey()],
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
            return createMutation
                .mutateAsync({ values: _values })
                .then(() => navigate(-1));
        },
        [navigate, createMutation]
    );

    return (
        <div className="template-editor">
            <PageHeader title="Create" onBack={() => navigate(-1)} />
            <TemplateForm onFinish={onFinish} ref={fileRef} />
        </div>
    );
}
Component.displayName = "TemplateEditor";
