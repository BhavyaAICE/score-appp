import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Navigation from './Navigation';
import { motion } from 'framer-motion';

const GlassLayout = ({ children, breadcrumb }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #16213e 50%, #0f172a 100%)', // Deep Base
            }}
        >
            {/* Animated Background Elements */}
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        opacity: [0.4, 0.6, 0.4]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', top: '-10%', left: '-10%',
                        width: '60vw', height: '60vw',
                        background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)',
                        filter: 'blur(80px)',
                        borderRadius: '50%'
                    }}
                />
                <motion.div
                    animate={{
                        x: [0, -150, 0],
                        y: [0, 100, 0],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', bottom: '-10%', right: '-10%',
                        width: '70vw', height: '70vw',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                        filter: 'blur(100px)',
                        borderRadius: '50%'
                    }}
                />
            </Box>

            {/* Navigation (Floating Glass) */}
            <Box sx={{ position: 'relative', zIndex: 10 }}>
                <Navigation breadcrumb={breadcrumb} />
            </Box>

            {/* Main Content Area */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 2, md: 4 },
                    maxWidth: '1600px',
                    mx: 'auto'
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default GlassLayout;
