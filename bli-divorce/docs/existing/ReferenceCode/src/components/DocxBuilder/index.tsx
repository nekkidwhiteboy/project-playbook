import { Alert, Form, Modal, Typography } from "antd";
import api from "api";
import { isAxiosError } from "axios";
import type { FormResult } from "components/DynamicForm/types";
import { allRulesPass } from "components/DynamicForm/util";
import LoadingIndicator from "components/LoadingIndicator";
import { useCurrentUser } from "hooks/useCurrentUser";
import { merge } from "lodash";
import { useCallback, useMemo, useState } from "react";
import DocxBuilderForm from "./DocxBuilderForm";
import { useTemplateSets } from "./hooks";

interface DocxBuilderProps {
    open: boolean;
    onOk: () => void;
    onCancel: () => void;
    result?: FormResult;
}

export default function DocxBuilder(props: DocxBuilderProps) {
    const result = props.result;
    const formId = result?.form.id;

    const { data: user, status: userStatus } = useCurrentUser();

    const [form] = Form.useForm<{ setId: number; [key: string]: any }>();

    const [generating, setGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const { data, status: templateStatus } = useTemplateSets({
        variables: {
            form: formId,
        },
    });
    const templateSets = useMemo(
        () =>
            data?.items.filter((set) =>
                allRulesPass(set, result?.items ?? {})
            ) ?? [],
        [result, data]
    );

    const onOk = useCallback(async () => {
        setGenerating(true);
        setErrorMessage("");

        let { setId, ...extra } = await form.validateFields();
        extra = Object.entries(extra).reduce((e, [key, val]) => {
            try {
                e[key] = JSON.parse(val);
            } catch {
                e[key] = val;
            }
            return e;
        }, {} as { [key: string]: any });
        try {
            await generate(setId, props.result!.id, extra);
            return props.onOk();
        } catch (e: any) {
            if (isAxiosError(e)) {
                const data = JSON.parse(await e.response?.data.text());
                setErrorMessage(data?.detail ?? e.message);
            } else {
                setErrorMessage(e.message);
            }
        } finally {
            setGenerating(false);
        }
    }, [form, props]);

    if (!result) {
        return null;
    }

    return (
        <Modal
            title={
                <>
                    <Typography.Title style={{ fontSize: "1.5em" }}>
                        Generate Documents
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        {typeof result.owner !== "number"
                            ? `${result.owner.first_name} ${result.owner.last_name} `
                            : ""}
                        (#{result.id})
                    </Typography.Text>
                </>
            }
            open={props.open}
            onOk={onOk}
            onCancel={props.onCancel}
            okText="Generate"
            confirmLoading={generating}
            okButtonProps={{ disabled: !templateSets.length }}
            destroyOnClose
        >
            {(userStatus === "pending" || templateStatus === "pending") && (
                <LoadingIndicator />
            )}

            {userStatus === "success" && templateStatus === "success" && (
                <DocxBuilderForm
                    form={form}
                    disabled={generating}
                    templateSets={templateSets}
                    context={merge(result.items, { meta: { user } })}
                />
            )}
            {errorMessage && (
                <Alert
                    type="error"
                    message="Unable to Generate Documents!"
                    description={errorMessage}
                    showIcon
                />
            )}
        </Modal>
    );
}
async function generate(
    templateSetId: number,
    resultId: number,
    extraFields = {}
) {
    const response = await api.post(
        `docxbuilder/sets/${templateSetId}/generate/`,
        {
            result_id: resultId,
            extra_data: extraFields,
        },
        { responseType: "blob" }
    );

    const file = window.URL.createObjectURL(await response.data);
    const filename = response.headers["content-disposition"]
        ?.split("filename=")[1]
        .replaceAll('"', "");

    const a = document.createElement("a");
    a.href = file;
    if (filename) {
        a.download = filename;
    }
    a.click();

    setTimeout(() => {
        window.URL.revokeObjectURL(file);
    }, 250);
}
