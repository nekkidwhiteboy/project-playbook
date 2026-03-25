import { Field, FieldProps } from "formik";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { PhoneNumberItem } from "../types";

interface Props
    extends Omit<PhoneNumberItem, "type" | "label" | "rules" | "validators"> {
    onChange?: (value: string | null) => void;
    fast?: boolean;
}

const PhoneNumberInput = ({
    fast = false,
    name,
    onChange,
    ...props
}: Props) => {
    return (
        <Field name={name} fast={fast}>
            {({ field: { value }, form: { setFieldValue } }: FieldProps) => (
                <div>
                    <PhoneInput
                        {...props}
                        value={value}
                        onChange={(val?: string) => {
                            setFieldValue(name, val ?? null);
                            onChange?.(val ?? null);
                        }}
                    />
                </div>
            )}
        </Field>
    );
};

export default PhoneNumberInput;
