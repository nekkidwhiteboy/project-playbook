import EllipsisOutlined from "@ant-design/icons/lib/icons/EllipsisOutlined";
import { Button, Col, Popover, Row } from "antd";
import confirm from "antd/lib/modal/confirm";
import { FC, ReactNode } from "react";

export interface ExtraActionItem {
    label: string;
    action: () => Promise<void> | void;
    disabled?: boolean;
    hideIfDisabled?: boolean;
    danger?: boolean;
    confirm?: boolean | { title: string; content: ReactNode };
}

interface ExtraActionProps {
    actions: ExtraActionItem[];
}

const ExtraActions: FC<ExtraActionProps> = ({ actions }) => {
    const items = actions.reduce((items, item) => {
        if (item.disabled && item.hideIfDisabled) return items;

        const onClick: React.MouseEventHandler<HTMLElement> = (e) => {
            e.stopPropagation();
            if (!item.confirm) {
                item.action();
            } else if (typeof item.confirm === "boolean") {
                confirm({
                    title: "Are you sure?",
                    content: (
                        <p>
                            This action <strong>cannot</strong> be undone.
                        </p>
                    ),
                    okText: "Yes",
                    okType: "danger",
                    cancelText: "No",
                    zIndex: 1050,
                    async onOk() {
                        await item.action();
                    },
                });
            } else {
                confirm({
                    ...item.confirm,
                    okText: "Yes",
                    okType: "danger",
                    cancelText: "No",
                    zIndex: 1050,
                    async onOk() {
                        await item.action();
                    },
                });
            }
        };

        return [
            ...items,
            <Row key={item.label}>
                <Col>
                    <Button
                        type="text"
                        onClick={onClick}
                        disabled={item.disabled}
                        danger={item.danger}
                    >
                        {item.label}
                    </Button>
                </Col>
            </Row>,
        ];
    }, [] as JSX.Element[]);
    if (items.length === 0) {
        return (
            <Button type="text" size="small" disabled>
                <EllipsisOutlined />
            </Button>
        );
    }
    return (
        <Popover content={items} trigger="click" placement="bottomLeft">
            <Button
                type="text"
                size="small"
                onClick={(e) => e.stopPropagation()}
            >
                <EllipsisOutlined />
            </Button>
        </Popover>
    );
};

export default ExtraActions;
