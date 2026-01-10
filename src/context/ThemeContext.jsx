import React, { createContext, useState, useEffect, useCallback } from "react";

export const ThemeContext = createContext();

const themes = {
  light: {
    name: "light",
    background: "#ffffff",
    color: "#000000",
    cardBackground: "#f9f9f9",
    buttonBackground: "#007bff",
    buttonColor: "#ffffff",
  },
  dark: {
    name: "dark",
    background: "#121212",
    color: "#ffffff",
    cardBackground: "#1e1e1e",
    buttonBackground: "#bb86fc",
    buttonColor: "#000000",
  },
  event: {
    name: "event",
    background: "#ffefd5",
    color: "#5a2a27",
    cardBackground: "#ffe4c4",
    buttonBackground: "#ff7f50",
    buttonColor: "#ffffff",
  },
  highContrast: {
    name: "highContrast",
    background: "#ffffff",
    color: "#000000",
    cardBackground: "#ffffff",
    buttonBackground: "#0000ee",
    buttonColor: "#ffffff",
  },
};

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fairscore-theme') || 'light';
    }
    return 'light';
  });
  
  const [theme, setTheme] = useState(themes[themeName] || themes.light);
  
  const [highContrastMode, setHighContrastMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fairscore-high-contrast') === 'true';
    }
    return false;
  });
  
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fairscore-reduced-motion');
      if (stored !== null) {
        return stored === 'true';
      }
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fairscore-font-size') || 'normal';
    }
    return 'normal';
  });

  useEffect(() => {
    setTheme(themes[themeName] || themes.light);
    localStorage.setItem('fairscore-theme', themeName);
  }, [themeName]);

  useEffect(() => {
    localStorage.setItem('fairscore-high-contrast', highContrastMode.toString());
    if (highContrastMode) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrastMode]);

  useEffect(() => {
    localStorage.setItem('fairscore-reduced-motion', reducedMotion.toString());
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('fairscore-font-size', fontSize);
    const sizes = {
      small: '87.5%',
      normal: '100%',
      large: '112.5%',
      xlarge: '125%'
    };
    document.documentElement.style.fontSize = sizes[fontSize] || '100%';
  }, [fontSize]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav-active');
      }
    };
    
    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-nav-active');
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const toggleTheme = useCallback((name) => {
    if (themes[name]) {
      setThemeName(name);
    }
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrastMode(prev => !prev);
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion(prev => !prev);
  }, []);

  const changeFontSize = useCallback((size) => {
    if (['small', 'normal', 'large', 'xlarge'].includes(size)) {
      setFontSize(size);
    }
  }, []);

  const accessibilitySettings = {
    highContrastMode,
    reducedMotion,
    fontSize,
    toggleHighContrast,
    toggleReducedMotion,
    changeFontSize,
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      themeName, 
      toggleTheme,
      ...accessibilitySettings 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
