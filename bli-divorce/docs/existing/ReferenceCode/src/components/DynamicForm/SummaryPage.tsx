import { DownloadOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import api from "api";
import LoadingIndicator from "components/LoadingIndicator";
import { useCurrentRole } from "hooks/useCurrentUser";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import ReviewTable from "./ReviewTable";
import { useResult } from "./hooks";

export default function ReviewPage() {
    const params = useParams();

    const resultId = parseInt(params.resultId ?? "0");
    const { data: result, status: resultStatus } = useResult({
        variables: { id: resultId },
        staleTime: 0,
    });
    const { isStaff } = useCurrentRole();

    return (
        <div style={{ maxWidth: 800 }}>
            <Helmet
                title={
                    result
                        ? `${result.form.name} #${result.id}`
                        : "Barrow Brown Carrington, PLLC"
                }
            />
            {resultStatus === "pending" ? (
                <LoadingIndicator />
            ) : resultStatus === "success" ? (
                <>
                    <Typography>
                        <Typography.Title style={{ textAlign: "center" }}>
                            {result.form.name} #{resultId}
                        </Typography.Title>
                    </Typography>
                    <div
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <Button
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => downloadResult(resultId)}
                        >
                            Download
                        </Button>
                    </div>
                    <ReviewTable
                        result={result}
                        showHidden={isStaff}
                        showMeta
                    />
                </>
            ) : (
                <p>Unable to load result</p>
            )}
        </div>
    );
}

async function downloadResult(id: number) {
    const response = await api.get(`/df/results/${id}/pdf/`, {
        responseType: "blob",
        headers: { Accept: "application/pdf" },
    });
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
