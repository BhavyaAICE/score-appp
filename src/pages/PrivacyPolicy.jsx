import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import "../styles/LandingPage.css";

function PrivacyPolicy() {
  const navigate = useNavigate();
  const { themeName } = useContext(ThemeContext);

  return (
    <div className={`landing-page ${themeName}`}>
      <nav className="landing-nav">
        <div className="nav-container-wide">
          <div className="logo" onClick={() => navigate("/")}>
            <h2>FairScore</h2>
          </div>
          <ul className="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/terms">Terms</a></li>
            <li><a href="/privacy">Privacy</a></li>
          </ul>
          <div className="nav-actions">
            <button className="login-btn" onClick={() => navigate("/login")}>Login</button>
          </div>
        </div>
      </nav>

      <section className="legal-section">
        <div className="legal-container">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last Updated: January 8, 2026</p>

          <div className="legal-content">
            <h2>1. Introduction</h2>
            <p>
              FairScore ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our judging and scoring platform.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Personal Information</h3>
            <p>We may collect the following types of personal information:</p>
            <ul>
              <li>Name and email address</li>
              <li>Organization and role information</li>
              <li>Account credentials (stored securely with encryption)</li>
              <li>Event participation data</li>
              <li>Scoring and evaluation data</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <p>When you use our platform, we automatically collect:</p>
            <ul>
              <li>IP address and browser type</li>
              <li>Device information</li>
              <li>Usage patterns and activity logs</li>
              <li>Session duration and interaction data</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li>Providing and maintaining our services</li>
              <li>Processing scoring and evaluation data</li>
              <li>Communicating with you about your account</li>
              <li>Improving our platform and services</li>
              <li>Ensuring security and preventing fraud</li>
              <li>Complying with legal obligations</li>
            </ul>

            <h2>4. Data Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul>
              <li>Event administrators within your organization</li>
              <li>Service providers who assist our operations</li>
              <li>Legal authorities when required by law</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h2>5. Data Security</h2>
            <p>
              We implement industry-standard security measures including:
            </p>
            <ul>
              <li>Encryption of data in transit (TLS) and at rest</li>
              <li>Secure authentication with JWT tokens</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and role-based permissions</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed 
              to provide services. Event data is retained according to your organization's 
              settings or applicable legal requirements. You may request deletion of 
              your data at any time.
            </p>

            <h2>7. Your Rights (GDPR)</h2>
            <p>Under GDPR and similar regulations, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
            </ul>

            <h2>8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. 
              These are necessary for the platform to function properly.
            </p>

            <h2>9. Children's Privacy</h2>
            <p>
              Our platform is not intended for children under 13 years of age. 
              We do not knowingly collect personal information from children.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify 
              you of any changes by posting the new policy on this page and updating 
              the "Last Updated" date.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise 
              your data rights, please contact us at:
            </p>
            <p>
              Email: privacy@fairscore.app<br />
              Data Protection Officer: dpo@fairscore.app
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-container-wide">
          <div className="footer-grid">
            <div className="footer-col">
              <h3>FairScore</h3>
              <p>Fair judging. Clear results.</p>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Use</a></li>
                <li><a href="/data-retention">Data Retention</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 FairScore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicy;
