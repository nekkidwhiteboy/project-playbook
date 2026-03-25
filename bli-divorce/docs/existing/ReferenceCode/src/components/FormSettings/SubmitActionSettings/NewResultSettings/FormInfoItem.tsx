import { Typography } from "antd";
import { useFormInfo } from "components/DynamicForm/hooks";

export default function FormInfoItem({ id }: { id?: number }) {
    const { data, status } = useFormInfo({
        variables: { id },
        staleTime: Infinity,
        gcTime: Infinity,
    });
    return (
        <Typography.Text>
            {status === "pending" ? (
                "Loading..."
            ) : status === "error" ? (
                `Unable to load <Form id=${id}>`
            ) : (
                <>
                    <Typography.Text type="secondary">
                        (#{data.id})
                    </Typography.Text>{" "}
                    {data.name}
                </>
            )}
        </Typography.Text>
    );
}
