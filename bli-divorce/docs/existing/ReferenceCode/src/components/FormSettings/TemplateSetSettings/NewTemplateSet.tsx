import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "antd";
import {
    useCreateTemplateSet,
    useTemplateSets,
} from "components/DocxBuilder/hooks";
import type { TemplateSet } from "components/DocxBuilder/types";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TemplateSetForm from "./TemplateSetForm";

import "./TemplateSetSettings.less";

export function Component() {
    const params = useParams();
    const formId = parseInt(params.formId ?? "0");
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const createMutation = useCreateTemplateSet({
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [useTemplateSets.getPrimaryKey],
            });
        },
    });

    const onFinish = useCallback(
        async (values: Partial<TemplateSet>) => {
            return createMutation
                .mutateAsync({
                    values: {
                        name: values.name,
                        form: formId,
                        visible_to: values.visible_to,
                        rules: values.rules,
                        templates:
                            values.templates?.map(({ rule, template }) => ({
                                rule,
                                template: template.id,
                            })) ?? [],
                    },
                })
                .then(() => navigate(".."));
        },
        [navigate, createMutation, formId]
    );
    return (
        <div className="template-set-editor">
            <PageHeader title="Create" onBack={() => navigate("..")} />
            <TemplateSetForm onFinish={onFinish} />
        </div>
    );
}
Component.displayName = "TemplateSetEditor";
