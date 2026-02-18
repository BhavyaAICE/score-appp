import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import "../styles/LandingPage.css";

function TermsOfUse() {
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
          <h1>Terms of Use</h1>
          <p className="last-updated">Last Updated: January 8, 2026</p>

          <div className="legal-content">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using FairScore ("Service"), you agree to be bound by these 
              Terms of Use. If you do not agree to these terms, please do not use our Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              FairScore is a digital judging and scoring platform designed for institutions, 
              hackathons, competitions, and events where fair, transparent, and dispute-free 
              results are critical.
            </p>

            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              To use certain features, you must register for an account. You agree to provide 
              accurate, current, and complete information during registration.
            </p>
            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities under your account. Notify us immediately of any unauthorized use.
            </p>
            <h3>3.3 Account Roles</h3>
            <p>
              Access levels are determined by assigned roles (Super Admin, Event Admin, Judge, Viewer). 
              Role assignments are managed by your organization's administrators.
            </p>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service's operation</li>
              <li>Submit false, misleading, or fraudulent scoring data</li>
              <li>Violate the intellectual property rights of others</li>
              <li>Share your account credentials with unauthorized parties</li>
            </ul>

            <h2>5. Scoring and Results</h2>
            <h3>5.1 Data Accuracy</h3>
            <p>
              You are responsible for the accuracy of data entered into the platform. 
              FairScore processes data using mathematical normalization algorithms but 
              does not verify the accuracy of raw inputs.
            </p>
            <h3>5.2 Immutability</h3>
            <p>
              Once an event is locked or published, scoring data becomes immutable. 
              Any modifications require administrative override with documented justification.
            </p>
            <h3>5.3 Dispute Resolution</h3>
            <p>
              Disputes regarding scores or results should be directed to your organization's 
              event administrators. FairScore provides audit logs to support fair resolution.
            </p>

            <h2>6. Intellectual Property</h2>
            <p>
              The Service, including its algorithms, design, and content, is protected by 
              intellectual property laws. You may not copy, modify, or distribute any part 
              of the Service without permission.
            </p>

            <h2>7. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy. By using 
              FairScore, you consent to our data practices as described in that policy.
            </p>

            <h2>8. Enterprise and White-Label Terms</h2>
            <p>
              Enterprise customers with white-label agreements may be subject to additional 
              terms specified in their service agreements.
            </p>

            <h2>9. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted 
              access. We may perform maintenance with reasonable notice when possible.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, FairScore shall not be liable for 
              any indirect, incidental, special, consequential, or punitive damages 
              resulting from your use of the Service.
            </p>

            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless FairScore from any claims, damages, 
              or expenses arising from your use of the Service or violation of these Terms.
            </p>

            <h2>12. Termination</h2>
            <p>
              We may terminate or suspend your account for violation of these Terms. 
              You may terminate your account at any time by contacting support.
            </p>

            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of 
              the Service after changes constitutes acceptance of the modified Terms.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable 
              laws. Any disputes shall be resolved through binding arbitration.
            </p>

            <h2>15. Contact</h2>
            <p>
              For questions about these Terms, please contact us at: legal@fairscore.app
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

export default TermsOfUse;
