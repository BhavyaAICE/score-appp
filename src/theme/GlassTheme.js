import { createTheme } from '@mui/material/styles';

const glassTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#3b82f6', // Bright Blue
            light: '#60a5fa',
            dark: '#2563eb',
        },
        secondary: {
            main: '#8b5cf6', // Violet
            light: '#a78bfa',
            dark: '#7c3aed',
        },
        background: {
            default: 'transparent',
            paper: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity
        },
        text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
        },
        success: {
            main: '#10b981',
        },
        warning: {
            main: '#f59e0b',
        },
        error: {
            main: '#ef4444',
        }
    },
    typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
        h1: { fontWeight: 800 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: "#3b82f6 #1e293b",
                    "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                        backgroundColor: "transparent",
                        width: "8px",
                    },
                    "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
                        borderRadius: "8px",
                        backgroundColor: "#334155",
                        border: "2px solid transparent",
                        backgroundClip: "content-box",
                    },
                    "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
                        backgroundColor: "#475569",
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                    backgroundImage: 'none', // Remove default gradient
                    '&.MuiMenu-paper': {
                        background: 'rgba(15, 23, 42, 0.95)',
                    },
                    transition: 'all 0.3s ease-in-out',
                },
                elevation1: {
                    // Default card style
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                }
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                    }
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                    boxShadow: 'none',
                },
                contained: {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    '&:hover': {
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
                    }
                },
                containedSecondary: {
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    '&:hover': {
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                    }
                },
                outlined: {
                    borderWidth: '2px',
                    '&:hover': {
                        borderWidth: '2px',
                        background: 'rgba(255,255,255,0.05)'
                    }
                }
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: 'rgba(15, 23, 42, 0.6) !important', // Force transparency
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: 'none',
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                },
                head: {
                    color: '#94a3b8',
                    fontWeight: 600,
                    background: 'rgba(0,0,0,0.2)',
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    backdropFilter: 'blur(4px)',
                },
                filled: {
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }
            }
        }
    },
});

export default glassTheme;
