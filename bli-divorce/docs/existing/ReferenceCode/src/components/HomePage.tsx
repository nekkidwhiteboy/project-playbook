import { Col, Row } from "antd";
import { UserRole, useCurrentUser } from "hooks/useCurrentUser";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import ResultList from "./ResultList";

import "./HomePage.less";

export default function HomePage() {
    const { data: user } = useCurrentUser();

    return (
        <div
            className="main-content"
            style={{ maxWidth: 850, overflow: "auto", flex: 1 }}
        >
            <Helmet title="Barrow Brown Carrington, PLLC" />
            <Row>
                <Col flex="auto">
                    {user ? (
                        user.role >= UserRole.Staff ? (
                            <Navigate to="/forms" replace />
                        ) : (
                            <ResultList />
                        )
                    ) : null}
                </Col>
            </Row>
        </div>
    );
}
