import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "antd";
import {
    useTemplateSet,
    useTemplateSets,
    useUpdateTemplateSet,
} from "components/DocxBuilder/hooks";
import type { TemplateSet } from "components/DocxBuilder/types";
import LoadingIndicator from "components/LoadingIndicator";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TemplateSetForm from "./TemplateSetForm";

import "./TemplateSetSettings.less";

export function Component() {
    const navigate = useNavigate();
    const params = useParams();
    const setId = parseInt(params.setId ?? "0");
    const queryClient = useQueryClient();

    const { data: set, status } = useTemplateSet({ variables: { id: setId } });

    const updateMutation = useUpdateTemplateSet({
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [useTemplateSets.getPrimaryKey()],
            });
        },
    });

    const onFinish = useCallback(
        async (values: TemplateSet) =>
            updateMutation
                .mutateAsync({
                    id: set!.id,
                    values: {
                        name: values.name,
                        visible_to: values.visible_to,
                        rules: values.rules,
                        templates:
                            values.templates?.map(({ rule, template }) => ({
                                rule,
                                template: template.id,
                            })) ?? [],
                    },
                })
                .then(() => navigate(-1)),
        [navigate, updateMutation, set]
    );
    return (
        <div className="template-set-editor">
            <PageHeader title="Edit" onBack={() => navigate(-1)} />
            {status === "pending" ? (
                <LoadingIndicator />
            ) : status === "error" ? (
                <p>Unable to load template set</p>
            ) : (
                <TemplateSetForm initialValues={set} onFinish={onFinish} />
            )}
        </div>
    );
}
Component.displayName = "TemplateSetEditor";
