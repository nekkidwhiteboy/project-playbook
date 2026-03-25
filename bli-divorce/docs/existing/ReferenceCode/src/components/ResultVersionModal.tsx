import { DiffOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Col,
    Modal,
    PageHeader,
    Row,
    Select,
    Space,
    Steps,
    Switch,
    Tag,
    type ModalProps,
} from "antd";
import dayjs from "dayjs";
import { useCurrentRole } from "hooks/useCurrentUser";
import { useMemo, useState, type FC } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { sortObjectKeys } from "util/functions";
import { useResetResult, useResult } from "./DynamicForm/hooks";
import type { ResultVersion } from "./DynamicForm/types";
import UserItem from "./FormSettings/UserItem";
import LoadingIndicator from "./LoadingIndicator";

interface ResultVersionModalProps extends ModalProps {
    versions: ResultVersion[];
}

const ResultVersionModal: FC<ResultVersionModalProps> = ({
    versions,
    title = "Versions",
    ...props
}) => {
    const versionOptions = useMemo(
        () =>
            versions.map((v) => ({
                label: `${v.is_current ? "*" : ""}${v.description}`,
                value: v.id,
            })),
        [versions]
    );

    const [splitView, setSplitView] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [oldVersion, setOldVersion] = useState<number>();
    const [newVersion, setNewVersion] = useState<number>();
    const { data: oldValue, status: oldStatus } = useResult({
        variables: {
            id: versions[0]?.result,
            version: oldVersion,
        },
        enabled: showDiff,
        staleTime: Infinity,
        gcTime: Infinity,
    });
    const { data: newValue, status: newStatus } = useResult({
        variables: {
            id: versions[0]?.result,
            version: newVersion,
        },
        enabled: showDiff,
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const queryClient = useQueryClient();
    const resetMutation = useResetResult({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: useResult.getKey() }),
    });

    const { isAdmin } = useCurrentRole();

    return (
        <Modal
            title={title}
            {...props}
            onCancel={(e) => {
                setShowDiff(false);
                props.onCancel?.(e);
            }}
            onOk={(e) => {
                setShowDiff(false);
                props.onOk?.(e);
            }}
            bodyStyle={{
                maxHeight: 400,
                overflowY: "auto",
                padding: "5px 20px",
            }}
            cancelButtonProps={{ style: { display: "None" } }}
            okText="Close"
        >
            {showDiff ? (
                <div>
                    <PageHeader
                        title="Changes"
                        onBack={() => setShowDiff(false)}
                        style={{ padding: "5px 0px" }}
                        extra={
                            <label>
                                Split View{" "}
                                <Switch
                                    checked={splitView}
                                    onChange={(c) => setSplitView(c)}
                                />
                            </label>
                        }
                    />
                    {oldStatus === "pending" || newStatus === "pending" ? (
                        <LoadingIndicator />
                    ) : oldStatus === "error" || newStatus === "error" ? (
                        <span>Unable to load versions.</span>
                    ) : (
                        <Space direction="vertical">
                            <Row style={{ width: 480 }}>
                                <Col flex={1}>
                                    <Select
                                        options={versionOptions}
                                        value={oldVersion}
                                        onChange={(v) => setOldVersion(v)}
                                        style={{ width: 200 }}
                                    />
                                </Col>
                                <Col flex={1}>
                                    <Select
                                        options={versionOptions}
                                        value={newVersion}
                                        onChange={(v) => setNewVersion(v)}
                                        style={{ width: 200 }}
                                    />
                                </Col>
                            </Row>
                            <ReactDiffViewer
                                oldValue={JSON.stringify(
                                    sortObjectKeys(oldValue.items),
                                    null,
                                    2
                                )}
                                newValue={JSON.stringify(
                                    sortObjectKeys(newValue.items),
                                    null,
                                    2
                                )}
                                compareMethod={DiffMethod.JSON}
                                splitView={splitView}
                                extraLinesSurroundingDiff={0}
                                disableWordDiff
                            />
                        </Space>
                    )}
                </div>
            ) : (
                <Steps
                    progressDot
                    direction="vertical"
                    items={versions.map((version, i) => ({
                        title: (
                            <Space>
                                <span>{version.description}</span>
                                {version.is_current && (
                                    <Tag color="green">Current</Tag>
                                )}
                                <Button
                                    type="text"
                                    icon={<DiffOutlined />}
                                    title="View Changes"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOldVersion(
                                            versions[
                                                Math.min(
                                                    i + 1,
                                                    versions.length - 1
                                                )
                                            ].id
                                        );
                                        setNewVersion(version.id);
                                        setShowDiff(true);
                                    }}
                                />
                            </Space>
                        ),
                        description: (
                            <div>
                                <div>
                                    Created:{" "}
                                    {dayjs(version.created_date).format(
                                        "M/DD/YYYY [at] H:mm:ss A"
                                    )}
                                </div>
                                <div>
                                    By: <UserItem value={version.created_by} />
                                </div>
                            </div>
                        ),
                        status: version.is_current ? "process" : "finish",
                    }))}
                    onChange={
                        isAdmin
                            ? (v) =>
                                  resetMutation.mutate({
                                      id: versions[0]?.result,
                                      version: versions[v]?.id,
                                  })
                            : undefined
                    }
                    current={versions.findIndex((r) => r.is_current)}
                />
            )}
        </Modal>
    );
};
export default ResultVersionModal;
