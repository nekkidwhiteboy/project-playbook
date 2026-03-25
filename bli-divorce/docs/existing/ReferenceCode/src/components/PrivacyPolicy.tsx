import { Typography } from "antd";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
    return (
        <div className="main-content" style={{ maxWidth: 850 }}>
            <Helmet title="Privacy Policy | Barrow Brown Carrington, PLLC">
                <style>
                    {`
                    .privacy-policy > li::marker {
                        font-size: 30px;
                        font-weight: 600;
                    }
                `}
                </style>
            </Helmet>
            <Typography style={{ paddingLeft: "35px", paddingRight: "35px" }}>
                <Typography.Title style={{ textAlign: "center" }}>
                    Privacy Policy
                </Typography.Title>
                <ol className="privacy-policy">
                    <li>
                        <Typography.Title level={2}>
                            What Information Do We Collect?
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                We collect information from you when you fill
                                out a form. This includes registering on our
                                site, as well as all other subsequent forms. In
                                order to register, you must provide your name
                                and a valid email address. Registering is
                                required to continue using some areas of our
                                Website.
                            </p>
                        </Typography.Paragraph>
                        <Typography.Paragraph>
                            <p>
                                Information collected on other forms within our
                                site depends on the specific form and its
                                purpose.
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            How Do We Protect Your Data?
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                We implement a variety of security measures to
                                maintain the safety of your personal information
                                when you enter, submit, or access your personal
                                information. These measures include, but are not
                                limited to, site-wide industry-standard security
                                certificates, as well as server-level firewalls
                                and disk write protection.
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Do We Use Cookies
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                Our site only uses cookies that are strictly
                                required for the functionality of our site. This
                                includes, but is not necessarily limited to, the
                                purpose of authenticating our users.
                            </p>
                        </Typography.Paragraph>
                        <Typography.Paragraph>
                            <p>
                                Additionally, some forms may include embedded
                                media, such as YouTube videos, which may set
                                their own cookies and are subject to their own
                                respective privacy policies.
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Do We Disclose Any Information to Outside Parties?
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                All information entered into our forms will be
                                treated as confidential. We do not sell, trade,
                                or otherwise transfer to outside parties your
                                personally identifiable information. This does
                                not include trusted third parties who assist us
                                in operating our website, conducting our
                                business, or servicing you, so long as those
                                parties agree to keep this information
                                confidential. We may also release your
                                information when we believe release is
                                appropriate to comply with the law, enforce our
                                site policies, or protect ours or others rights,
                                property, or safety.
                            </p>
                        </Typography.Paragraph>
                        <Typography.Paragraph strong>
                            <p>
                                We will not provide any of your information to
                                other parties for the purposes of marketing or
                                advertising.
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Children's Online Privacy Protection Act Compliance
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                We are in compliance with the requirements of
                                COPPA (Children's Online Privacy Protection
                                Act), we do not collect any information from
                                anyone under 13 years of age. Our website,
                                products and services are all directed to people
                                who are at least 18 years old or older.
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Terms &amp; Conditions
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                Please also visit our{" "}
                                <Link to="/terms-and-conditions">
                                    Terms &amp; Conditions
                                </Link>{" "}
                                section establishing the use, disclaimers, and
                                limitations of liability governing the use of
                                our website
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Your Consent
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                By using our site, you consent to our website's
                                privacy policy.
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Changes to Our Privacy Policy
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                If we decide to change our privacy policy, we
                                will post those changes on this page.
                            </p>
                        </Typography.Paragraph>
                        <Typography.Paragraph>
                            <p>
                                This policy was last modified on April 30, 2024
                            </p>
                        </Typography.Paragraph>
                    </li>
                    <li>
                        <Typography.Title level={2}>
                            Contacting Us
                        </Typography.Title>
                        <Typography.Paragraph>
                            <p>
                                If there are any questions regarding this
                                privacy policy, you may contact us using the
                                information below:
                            </p>
                        </Typography.Paragraph>
                        <Typography.Paragraph>
                            <p>
                                Barrow Brown Carrington, PLLC
                                <br />
                                2501 Nelson Miller Pkwy #102
                                <br />
                                Louisville, Kentucky 40223
                                <br />
                                USA
                                <br />
                                <Typography.Link href="mailto:supportteam@bbc.law">
                                    supportteam@bbc.law
                                </Typography.Link>
                                <br />
                                <Typography.Link href="tel:+15025899353">
                                    502-589-9353
                                </Typography.Link>
                            </p>
                        </Typography.Paragraph>
                    </li>
                </ol>
            </Typography>
        </div>
    );
};

export default PrivacyPolicy;
