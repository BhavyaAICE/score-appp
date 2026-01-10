import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const AccessibilitySettings = ({ isOpen, onClose }) => {
  const {
    highContrastMode,
    reducedMotion,
    fontSize,
    toggleHighContrast,
    toggleReducedMotion,
    changeFontSize,
  } = useContext(ThemeContext);

  if (!isOpen) return null;

  const fontSizeOptions = [
    { value: 'small', label: 'Small (87.5%)' },
    { value: 'normal', label: 'Normal (100%)' },
    { value: 'large', label: 'Large (112.5%)' },
    { value: 'xlarge', label: 'Extra Large (125%)' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-settings-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #ffffff)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '2px solid var(--border-color, #e5e7eb)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h2 
            id="a11y-settings-title"
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: 'var(--text-primary, #1f2937)',
              margin: 0,
            }}
          >
            Accessibility Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close accessibility settings"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary, #6b7280)',
              padding: '8px',
              borderRadius: '8px',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '12px',
            }}
          >
            <div>
              <label 
                htmlFor="high-contrast-toggle"
                style={{ 
                  fontWeight: '600', 
                  color: 'var(--text-primary, #1f2937)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                High Contrast Mode
              </label>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary, #6b7280)',
                margin: 0,
              }}>
                Increases contrast for better visibility
              </p>
            </div>
            <button
              id="high-contrast-toggle"
              role="switch"
              aria-checked={highContrastMode}
              onClick={toggleHighContrast}
              style={{
                width: '56px',
                height: '32px',
                borderRadius: '16px',
                border: '2px solid',
                borderColor: highContrastMode ? 'var(--primary-color, #2563eb)' : 'var(--border-color, #e5e7eb)',
                backgroundColor: highContrastMode ? 'var(--primary-color, #2563eb)' : 'var(--bg-primary, #ffffff)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
                minHeight: '44px',
                minWidth: '56px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: highContrastMode ? '28px' : '4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: highContrastMode ? '#ffffff' : 'var(--text-secondary, #6b7280)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>

          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '12px',
            }}
          >
            <div>
              <label 
                htmlFor="reduced-motion-toggle"
                style={{ 
                  fontWeight: '600', 
                  color: 'var(--text-primary, #1f2937)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Reduce Motion
              </label>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary, #6b7280)',
                margin: 0,
              }}>
                Minimizes animations throughout the app
              </p>
            </div>
            <button
              id="reduced-motion-toggle"
              role="switch"
              aria-checked={reducedMotion}
              onClick={toggleReducedMotion}
              style={{
                width: '56px',
                height: '32px',
                borderRadius: '16px',
                border: '2px solid',
                borderColor: reducedMotion ? 'var(--primary-color, #2563eb)' : 'var(--border-color, #e5e7eb)',
                backgroundColor: reducedMotion ? 'var(--primary-color, #2563eb)' : 'var(--bg-primary, #ffffff)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
                minHeight: '44px',
                minWidth: '56px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: reducedMotion ? '28px' : '4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: reducedMotion ? '#ffffff' : 'var(--text-secondary, #6b7280)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>

          <div 
            style={{ 
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '12px',
            }}
          >
            <label 
              htmlFor="font-size-select"
              style={{ 
                fontWeight: '600', 
                color: 'var(--text-primary, #1f2937)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Text Size
            </label>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary, #6b7280)',
              margin: '0 0 12px 0',
            }}>
              Adjust the text size for better readability
            </p>
            <select
              id="font-size-select"
              value={fontSize}
              onChange={(e) => changeFontSize(e.target.value)}
              aria-describedby="font-size-description"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid var(--border-color, #e5e7eb)',
                backgroundColor: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #1f2937)',
                fontSize: '1rem',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {fontSizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div 
            style={{ 
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ 
              fontWeight: '600', 
              color: 'var(--text-primary, #1f2937)',
              marginBottom: '12px',
              fontSize: '1rem',
            }}>
              Keyboard Shortcuts
            </h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <li style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #6b7280)',
              }}>
                <span>Navigate elements</span>
                <kbd style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--bg-primary, #ffffff)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                }}>Tab</kbd>
              </li>
              <li style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #6b7280)',
              }}>
                <span>Activate buttons/links</span>
                <kbd style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--bg-primary, #ffffff)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                }}>Enter / Space</kbd>
              </li>
              <li style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #6b7280)',
              }}>
                <span>Close dialogs</span>
                <kbd style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--bg-primary, #ffffff)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                }}>Escape</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div style={{ 
          marginTop: '24px', 
          display: 'flex', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--primary-color, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
