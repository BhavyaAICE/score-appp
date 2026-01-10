import React from 'react';

const SkipLink = ({ targetId = 'main-content', children = 'Skip to main content' }) => {
  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--primary-color, #2563eb)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '0 0 8px 8px',
        fontWeight: '600',
        fontSize: '14px',
        zIndex: 10000,
        textDecoration: 'none',
        transition: 'top 0.2s ease',
      }}
      onFocus={(e) => {
        e.target.style.top = '0';
      }}
      onBlur={(e) => {
        e.target.style.top = '-100px';
      }}
    >
      {children}
    </a>
  );
};

export default SkipLink;
