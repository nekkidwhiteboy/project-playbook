import { Button, Col, Row } from "antd";
import LoadingIndicator from "components/LoadingIndicator";
import { useLocationWithState } from "hooks/use-location-with-state";
import { useNavigate, useParams } from "react-router-dom";
import { LocationState } from "./DynamicFormResult";
import { useResult, useSuccessPage } from "./hooks";
import { HtmlMarkup } from "./items/HtmlMarkup";
import { allRulesPass, replacePipes } from "./util";

const SuccessPage = () => {
    const params = useParams();
    const location = useLocationWithState<LocationState>();
    const navigate = useNavigate();

    const resultId = parseInt(params.resultId ?? "0");

    const { data: result, status: resultStatus } = useResult({
        variables: { id: resultId },
    });

    const { data: schema, status: schemaStatus } = useSuccessPage({
        variables: { id: location.state.pageId },
    });

    if (resultStatus === "pending" || schemaStatus === "pending") {
        return <LoadingIndicator />;
    }

    if (resultStatus === "success" && schemaStatus === "success") {
        return (
            <div>
                {schema.rows
                    .filter((item) => allRulesPass(item, result.items))
                    .map(({ content, name, ...props }) => (
                        <HtmlMarkup
                            text={replacePipes(content, result.items)}
                            key={name}
                            {...props}
                        />
                    ))}
                <Row
                    gutter={[10, 10]}
                    style={{ marginTop: "1em" }}
                    key="controls"
                    justify="center"
                >
                    <Col xs={24} sm={12}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => navigate("/", { replace: true })}
                            block
                        >
                            Continue
                        </Button>
                    </Col>
                </Row>
            </div>
        );
    }
    return <div>error</div>;
};

export default SuccessPage;
