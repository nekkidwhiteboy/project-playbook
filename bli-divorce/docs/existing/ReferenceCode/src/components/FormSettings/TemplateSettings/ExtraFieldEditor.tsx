import { Col, Input, Row } from "antd";
import type { ExtraField } from "components/DocxBuilder/types";
import { useCallback } from "react";

interface ExtraFieldEditorProps {
    value?: ExtraField;
    onChange?: (value: ExtraField) => void;
}
export default function ExtraFieldEditor({
    value: _value,
    onChange,
}: ExtraFieldEditorProps) {
    const { name, value } = _value ?? { name: "", value: "" };
    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.({
                name: e.target.value,
                value,
            });
        },
        [onChange, value]
    );
    const handleValueChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            let value;
            try {
                value = JSON.parse(e.target.value);
            } catch {
                value = e.target.value;
            }
            onChange?.({
                name,
                value,
            });
        },
        [onChange, name]
    );
    return (
        <Row gutter={4} style={{ flexGrow: 1 }}>
            <Col>
                <Input
                    value={name}
                    placeholder="Name"
                    onChange={handleNameChange}
                />
            </Col>
            <Col flex={1}>
                <Input.TextArea
                    value={
                        typeof value === "object" || typeof value === "boolean"
                            ? JSON.stringify(value)
                            : value
                    }
                    placeholder="Value"
                    rows={1}
                    onChange={handleValueChange}
                />
            </Col>
        </Row>
    );
}
