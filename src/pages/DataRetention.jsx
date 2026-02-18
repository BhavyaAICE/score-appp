import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import "../styles/LandingPage.css";

function DataRetention() {
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
          <h1>Data Retention Policy</h1>
          <p className="last-updated">Last Updated: January 8, 2026</p>

          <div className="legal-content">
            <h2>1. Overview</h2>
            <p>
              This Data Retention Policy outlines how FairScore retains, manages, and 
              disposes of data collected through our platform. Our goal is to retain 
              data only as long as necessary while ensuring compliance with legal 
              requirements and maintaining service quality.
            </p>

            <h2>2. Categories of Data</h2>
            
            <h3>2.1 Account Data</h3>
            <table className="retention-table">
              <thead>
                <tr>
                  <th>Data Type</th>
                  <th>Retention Period</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>User profiles</td>
                  <td>Duration of account + 30 days</td>
                  <td>Service provision</td>
                </tr>
                <tr>
                  <td>Authentication logs</td>
                  <td>90 days</td>
                  <td>Security monitoring</td>
                </tr>
                <tr>
                  <td>Organization data</td>
                  <td>Duration of contract + 1 year</td>
                  <td>Legal compliance</td>
                </tr>
              </tbody>
            </table>

            <h3>2.2 Event Data</h3>
            <table className="retention-table">
              <thead>
                <tr>
                  <th>Data Type</th>
                  <th>Retention Period</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Event configurations</td>
                  <td>3 years after event completion</td>
                  <td>Audit requirements</td>
                </tr>
                <tr>
                  <td>Raw scoring data</td>
                  <td>3 years after event completion</td>
                  <td>Dispute resolution</td>
                </tr>
                <tr>
                  <td>Normalized results</td>
                  <td>3 years after event completion</td>
                  <td>Record keeping</td>
                </tr>
                <tr>
                  <td>Published results</td>
                  <td>Indefinite (or per organization policy)</td>
                  <td>Public record</td>
                </tr>
              </tbody>
            </table>

            <h3>2.3 Audit and Security Data</h3>
            <table className="retention-table">
              <thead>
                <tr>
                  <th>Data Type</th>
                  <th>Retention Period</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Audit logs</td>
                  <td>7 years</td>
                  <td>Regulatory compliance</td>
                </tr>
                <tr>
                  <td>Security alerts</td>
                  <td>2 years</td>
                  <td>Security analysis</td>
                </tr>
                <tr>
                  <td>Admin overrides</td>
                  <td>7 years</td>
                  <td>Audit trail</td>
                </tr>
                <tr>
                  <td>Computation logs</td>
                  <td>5 years</td>
                  <td>Verification</td>
                </tr>
              </tbody>
            </table>

            <h2>3. Data Deletion</h2>
            <h3>3.1 User-Initiated Deletion</h3>
            <p>
              Users may request deletion of their personal data at any time by contacting 
              support@fairscore.app. We will process deletion requests within 30 days.
            </p>

            <h3>3.2 Account Deletion</h3>
            <p>
              When an account is deleted:
            </p>
            <ul>
              <li>Personal profile data is removed within 30 days</li>
              <li>Authentication data is immediately invalidated</li>
              <li>Event data associated with the user is anonymized, not deleted</li>
              <li>Audit logs are retained for compliance purposes</li>
            </ul>

            <h3>3.3 Organization Deletion</h3>
            <p>
              When an organization account is terminated:
            </p>
            <ul>
              <li>All organization data is exported upon request</li>
              <li>Data deletion begins 30 days after termination</li>
              <li>Complete deletion within 90 days</li>
              <li>Backup data is purged within 180 days</li>
            </ul>

            <h2>4. Data Export (Portability)</h2>
            <p>
              In compliance with GDPR and similar regulations, you may request a complete 
              export of your data in a structured, commonly used format (JSON or CSV).
            </p>
            <p>To request an export:</p>
            <ul>
              <li>Navigate to Account Settings &gt; Data Export</li>
              <li>Or contact: data@fairscore.app</li>
            </ul>
            <p>Exports are typically processed within 7 business days.</p>

            <h2>5. Legal Holds</h2>
            <p>
              In case of legal proceedings, regulatory investigations, or disputes, we may 
              place a legal hold on relevant data, suspending normal retention schedules 
              until the matter is resolved.
            </p>

            <h2>6. Enterprise Customization</h2>
            <p>
              Enterprise customers may negotiate custom retention periods based on their 
              specific regulatory requirements. These are documented in service agreements.
            </p>

            <h2>7. Data Security During Retention</h2>
            <p>
              All retained data is protected by:
            </p>
            <ul>
              <li>Encryption at rest using AES-256</li>
              <li>Encryption in transit using TLS 1.3</li>
              <li>Role-based access controls</li>
              <li>Regular security audits</li>
              <li>Automated backup and disaster recovery</li>
            </ul>

            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this policy as required by changes in law or business practices. 
              Significant changes will be communicated via email or platform notification.
            </p>

            <h2>9. Contact Information</h2>
            <p>
              For questions about data retention or to submit a data request:
            </p>
            <p>
              Email: data@fairscore.app<br />
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

export default DataRetention;
