import dayjs, { Dayjs } from "dayjs";
import { useFormikContext } from "formik";
import { Input, InputProps } from "formik-antd";
import { ChangeEvent } from "react";

interface Props extends Omit<InputProps, "onChange"> {
    onChange?: (time: Dayjs) => void;
    disabled?: boolean;
    readOnly?: boolean;
}

const TimePicker = ({
    style,
    onChange,
    step = 1,
    readOnly = false,
    disabled = false,
    ...props
}: Props) => {
    const { setFieldValue } = useFormikContext();
    const _onChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (disabled || readOnly) return e.stopPropagation();

        const time = dayjs(e.target.value, "HH:mm");
        const seconds = time.hour() * 3600 + time.minute() * 60 + time.second();

        const roundedVal = dayjs()
            .startOf("day")
            .add(roundTo(seconds, parseInt(step.toString())), "second");
        if (roundedVal.isValid()) {
            setFieldValue(props.name, roundedVal.format("HH:mm"));
            onChange?.(roundedVal);
        } else {
            setFieldValue(props.name, null);
            onChange?.(dayjs(null));
        }
    };

    return (
        <Input
            type="time"
            style={{
                verticalAlign: "middle",
                padding: "3px 11px",
                width: 120,
                ...style,
            }}
            step={step}
            onChange={_onChange}
            readOnly={readOnly}
            disabled={disabled}
            {...props}
        />
    );
};

export default TimePicker;

function roundTo(num: number, inc: number = 1) {
    return Math.round(num / inc) * inc;
}
