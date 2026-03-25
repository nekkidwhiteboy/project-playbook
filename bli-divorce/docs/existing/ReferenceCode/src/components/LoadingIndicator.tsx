import LoadingOutlined from "@ant-design/icons/lib/icons/LoadingOutlined";
import Spin, { SpinProps } from "antd/lib/spin";

const LoadingIndicator = ({ style, ...props }: SpinProps) => (
    <Spin
        delay={200}
        tip="Loading..."
        indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "110px",
            ...style,
        }}
        {...props}
    />
);
export default LoadingIndicator;
