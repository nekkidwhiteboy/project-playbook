import { Divider, Layout, Space, Typography } from "antd";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <Layout.Footer
            style={{ backgroundColor: "inherit", textAlign: "center" }}
        >
            <Typography>
                <p>Barrow Brown Carrington, PLLC ©{new Date().getFullYear()}</p>
                <Space
                    split={
                        <Divider
                            type="vertical"
                            style={{ borderLeft: "1px solid rgba(0,0,0,0.2)" }}
                        />
                    }
                    size={0}
                >
                    <Link to="/terms-and-conditions">
                        Terms &amp; Conditions
                    </Link>
                    <Link to="/privacy-policy">Privacy Policy</Link>
                </Space>
            </Typography>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignContent: "flex-end",
                    justifyContent: "center",
                    alignItems: "flex-end",
                    gap: 10,
                    marginTop: 14,
                }}
            >
                <a href="https://app.trustlock.co/verification/window/trust-badge-seal-business-TL-881535962696">
                    <img
                        width="175"
                        height="29"
                        src="https://app.trustlock.co/images/Static//business-trust-seal-badge-landscape.png"
                        alt="TrustLock business trust seal badge"
                    />
                </a>
                <a href="https://app.trustlock.co/verification/window/trust-badge-seal-privacy-TL-881535962696">
                    <img
                        width="175"
                        height="29"
                        src="https://app.trustlock.co/images/Static//privacy-trust-seal-badge-landscape.png"
                        alt="TrustLock privacy trust seal badge"
                    />
                </a>
                <a href="https://app.trustlock.co/verification/window/trust-badge-seal-ssl-TL-881535962696">
                    <img
                        width="175"
                        height="29"
                        src="https://app.trustlock.co/images/Static//ssl-trust-seal-badge-landscape.png"
                        alt="TrustLock SSL trust seal badge"
                    />
                </a>
            </div>
        </Layout.Footer>
    );
};

export default Footer;
