import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Box, Typography, Button, IconButton, Paper, Avatar, Chip, useTheme, useMediaQuery } from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const DynamicSlides = ({ slides, mode = "spotlight", autoPlay = false, autoPlayInterval = 6000 }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [direction, setDirection] = useState(1);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Parallax mouse effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
    const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                nextSlide();
            }, autoPlayInterval);
        }
        return () => clearInterval(interval);
    }, [currentIndex, isPlaying, autoPlayInterval]);

    const handleMouseMove = (e) => {
        // Calculate center of screen
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
    };

    const nextSlide = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    // --- Animation Variants ---

    // 1. Premium Spotlight (Split View 3D Enter)
    const spotlightVariants = {
        enter: (direction) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.9,
            rotateY: direction > 0 ? 30 : -30,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0,
            transition: {
                duration: 0.8,
                type: "spring",
                damping: 25,
                stiffness: 120
            }
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.85,
            rotateY: direction < 0 ? 30 : -30,
            filter: "blur(10px)",
            transition: {
                duration: 0.6,
                ease: "easeInOut"
            }
        })
    };

    // 2. High-Impact Reveal (Explosion/Scale)
    const revealVariants = {
        initial: {
            scale: 0.2,
            opacity: 0,
            y: 100,
            filter: "blur(20px)"
        },
        animate: {
            scale: 1,
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                duration: 0.8,
                type: "spring",
                bounce: 0.5
            }
        },
        exit: {
            scale: 1.2,
            opacity: 0,
            filter: "blur(20px)",
            transition: { duration: 0.4 }
        }
    };

    // Staggered text children
    const textVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: 0.3 + (i * 0.1),
                duration: 0.5,
                ease: "easeOut"
            }
        })
    };

    const currentSlide = slides[currentIndex];

    if (!currentSlide) return null;

    // Dynamic background based on mode
    const bgGradient = mode === 'reveal'
        ? `radial-gradient(circle at 50% 50%, #1a1a2e 0%, #16213e 50%, #0f172a 100%)` // Deep dark blue
        : `linear-gradient(135deg, #fdfbf7 0%, #e2e8f0 100%)`; // Clean warm gray

    const accentColor = mode === 'reveal' ? '#fbbf24' : '#3b82f6';

    return (
        <Box
            onMouseMove={handleMouseMove}
            sx={{
                position: 'relative',
                width: '100%',
                height: { xs: '700px', md: '600px' },
                overflow: 'hidden',
                background: bgGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // glass border container
                borderRadius: 6,
                boxShadow: mode === 'reveal'
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                perspective: '2000px', // Crucial for 3D
                border: mode === 'reveal' ? '1px solid rgba(255,255,255,0.1)' : '4px solid rgba(255,255,255,0.5)',
            }}
        >

            {/* --- Animated Background Elements --- */}
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {/* Floating Orbs - More blurry and ambient */}
                <motion.div
                    animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', top: '-20%', right: '-10%',
                        width: '600px', height: '600px',
                        background: mode === 'reveal'
                            ? 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                    }}
                />
                <motion.div
                    animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.5, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', bottom: '-20%', left: '-10%',
                        width: '500px', height: '500px',
                        background: mode === 'reveal'
                            ? 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                    }}
                />
            </Box>

            {/* --- Main 3D Card Container --- */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={mode === 'reveal' ? revealVariants : spotlightVariants}
                    initial={mode === 'reveal' ? "initial" : "enter"}
                    animate={mode === 'reveal' ? "animate" : "center"}
                    exit="exit"
                    style={{
                        width: '90%',
                        maxWidth: '1100px',
                        height: 'auto',
                        minHeight: '400px',
                        position: 'absolute',
                        transformStyle: 'preserve-3d', // Enable nested 3D
                        rotateX: mode === 'reveal' ? rotateX : 0, // Apply mouse parallax only in reveal for dramatic effect
                        rotateY: mode === 'reveal' ? rotateY : 0,
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            overflow: 'hidden',
                            borderRadius: { xs: 4, md: 8 },
                            background: mode === 'reveal'
                                ? 'rgba(30, 41, 59, 0.6)' // Dark glass
                                : 'rgba(255, 255, 255, 0.75)', // Light glass
                            backdropFilter: 'blur(24px) saturate(180%)',
                            border: '1px solid isset',
                            borderColor: mode === 'reveal'
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(255,255,255,0.8)',
                            boxShadow: mode === 'reveal'
                                ? '0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.4)'
                                : '0 0 0 1px rgba(255,255,255,0.6), 0 20px 40px rgba(0,0,0,0.1)',
                            height: '100%',
                            transform: 'translateZ(20px)', // Pop out
                        }}
                    >

                        {/* LEFT: Image Section (Spotlight) or Top (Mobile) */}
                        <Box sx={{
                            flex: { md: 1 },
                            position: 'relative',
                            minHeight: { xs: '300px', md: 'auto' },
                            overflow: 'hidden',
                            display: mode === 'reveal' && !isMobile ? 'none' : 'block' // Hide large image in reveal desktop, keep layout flexible
                        }}>
                            {/* Parallax Image Wrapper */}
                            <motion.div
                                style={{ width: '100%', height: '100%', scale: 1.1 }}
                                animate={{ x: mode === 'spotlight' ? [0, -10, 0] : 0 }} // Subtle movement
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            >
                                <Box
                                    component="img"
                                    src={currentSlide.image || "https://source.unsplash.com/random/800x600?technology"}
                                    alt={currentSlide.title}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        filter: mode === 'reveal' ? 'brightness(0.7)' : 'none',
                                    }}
                                />
                            </motion.div>

                            {/* Overlay Gradient */}
                            <Box sx={{
                                position: 'absolute', inset: 0,
                                background: mode === 'reveal'
                                    ? 'linear-gradient(to top, #1e293b, transparent)'
                                    : 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 100%)'
                            }} />

                            {/* Floating Category Badge */}
                            <Box sx={{ position: 'absolute', top: 20, left: 20 }}>
                                <motion.div initial="hidden" animate="visible" custom={0} variants={textVariants}>
                                    <Chip
                                        label={currentSlide.category || "General"}
                                        sx={{
                                            background: 'rgba(255, 255, 255, 0.25)',
                                            backdropFilter: 'blur(10px)',
                                            color: mode === 'reveal' ? 'white' : 'black',
                                            fontWeight: 700,
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                </motion.div>
                            </Box>
                        </Box>

                        {/* RIGHT: Content Section */}
                        <Box sx={{
                            flex: { md: mode === 'reveal' ? 1 : 1.2 },
                            p: { xs: 4, md: 6 },
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            textAlign: mode === 'reveal' ? 'center' : 'left',
                            position: 'relative',
                            // Add a subtle texture overlay
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}>

                            {/* Reveal Mode Specific: Rank & Glow */}
                            {mode === 'reveal' && (
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.2, type: 'spring' }}
                                    >
                                        <Box sx={{
                                            position: 'relative',
                                            width: 100, height: 100,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #FFD700, #FDB931)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 0 30px rgba(253, 185, 49, 0.6)',
                                            border: '4px solid rgba(255,255,255,0.4)'
                                        }}>
                                            <EmojiEventsIcon sx={{ fontSize: 50, color: '#92400e' }} />
                                            {currentSlide.rank && (
                                                <Box sx={{
                                                    position: 'absolute', bottom: -10,
                                                    background: '#92400e', color: 'white',
                                                    px: 2, py: 0.5, borderRadius: 10,
                                                    fontWeight: 'bold', fontSize: '0.9rem',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                                                }}>
                                                    {currentSlide.rank}
                                                </Box>
                                            )}
                                        </Box>
                                    </motion.div>
                                </Box>
                            )}

                            {/* Title with Gradient */}
                            <motion.div custom={1} variants={textVariants} initial="hidden" animate="visible">
                                <Typography variant={mode === 'reveal' ? "h2" : "h3"} sx={{
                                    fontWeight: 900,
                                    mb: 1,
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em',
                                    background: mode === 'reveal'
                                        ? 'linear-gradient(to bottom, #ffffff, #94a3b8)'
                                        : 'linear-gradient(to right, #0f172a, #334155)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    textShadow: mode === 'reveal' ? '0 4px 20px rgba(255,255,255,0.1)' : 'none'
                                }}>
                                    {currentSlide.title}
                                </Typography>
                            </motion.div>

                            {/* Subtitle */}
                            <motion.div custom={2} variants={textVariants} initial="hidden" animate="visible">
                                <Typography variant="h6" sx={{
                                    mb: 3,
                                    fontWeight: 600,
                                    color: mode === 'reveal' ? accentColor : 'primary.main',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontSize: '0.9rem'
                                }}>
                                    {currentSlide.subtitle}
                                </Typography>
                            </motion.div>

                            {/* Description */}
                            <motion.div custom={3} variants={textVariants} initial="hidden" animate="visible">
                                <Typography variant="body1" sx={{
                                    mb: 4,
                                    color: mode === 'reveal' ? '#cbd5e1' : '#475569',
                                    fontSize: '1.05rem',
                                    lineHeight: 1.7
                                }}>
                                    {currentSlide.description}
                                </Typography>
                            </motion.div>

                            {/* Reveal Score Block */}
                            {mode === 'reveal' && currentSlide.score && (
                                <motion.div custom={4} variants={textVariants} initial="hidden" animate="visible">
                                    <Box sx={{
                                        display: 'inline-flex',
                                        alignItems: 'baseline',
                                        gap: 1,
                                        p: 2,
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: 3,
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <Typography variant="h3" sx={{ fontWeight: 800, color: '#4ade80', textShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
                                            {currentSlide.score}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>/ 100</Typography>
                                    </Box>
                                </motion.div>
                            )}

                            {/* Action Button */}
                            {currentSlide.action && (
                                <motion.div custom={5} variants={textVariants} initial="hidden" animate="visible">
                                    <Button
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForwardIosIcon />}
                                        onClick={currentSlide.onAction}
                                        sx={{
                                            mt: 4,
                                            borderRadius: '16px',
                                            px: 4,
                                            py: 1.5,
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            textTransform: 'none',
                                            background: mode === 'reveal'
                                                ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
                                                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            boxShadow: mode === 'reveal'
                                                ? '0 10px 20px -5px rgba(245, 158, 11, 0.4)'
                                                : '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: mode === 'reveal'
                                                    ? '0 15px 30px -5px rgba(245, 158, 11, 0.5)'
                                                    : '0 15px 30px -5px rgba(37, 99, 235, 0.5)',
                                            },
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        {currentSlide.actionLabel || "Explore Project"}
                                    </Button>
                                </motion.div>
                            )}


                        </Box>
                    </Paper>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Overlay (sides) */}
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 10, px: 2 }}>
                <Box
                    onClick={prevSlide}
                    sx={{
                        width: '100px', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                        cursor: 'pointer', pointerEvents: 'auto',
                        opacity: 0, '&:hover': { opacity: 1 }, transition: 'opacity 0.3s',
                        background: 'linear-gradient(to right, rgba(0,0,0,0.2), transparent)'
                    }}
                >
                    <IconButton sx={{
                        color: 'white', bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' }
                    }}>
                        <ArrowBackIosNewIcon />
                    </IconButton>
                </Box>
                <Box
                    onClick={nextSlide}
                    sx={{
                        width: '100px', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        cursor: 'pointer', pointerEvents: 'auto',
                        opacity: 0, '&:hover': { opacity: 1 }, transition: 'opacity 0.3s',
                        background: 'linear-gradient(to left, rgba(0,0,0,0.2), transparent)'
                    }}
                >
                    <IconButton sx={{
                        color: 'white', bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' }
                    }}>
                        <ArrowForwardIosIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Bottom Controls */}
            <Box sx={{
                position: 'absolute', bottom: 30, zIndex: 20,
                display: 'flex', gap: 1.5, alignItems: 'center',
                background: 'rgba(25, 25, 35, 0.4)',
                backdropFilter: 'blur(16px)',
                borderRadius: '50px',
                p: '6px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
                <IconButton size="small" onClick={togglePlay} sx={{ color: 'white', p: 0.5 }}>
                    {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                </IconButton>
                <Box sx={{ width: '1px', height: '16px', bgcolor: 'rgba(255,255,255,0.2)' }} />
                {slides.map((_, index) => (
                    <Box
                        key={index}
                        onClick={() => {
                            setDirection(index > currentIndex ? 1 : -1);
                            setCurrentIndex(index);
                        }}
                        sx={{
                            width: index === currentIndex ? 32 : 8,
                            height: 6,
                            borderRadius: 4,
                            bgcolor: index === currentIndex
                                ? (mode === 'reveal' ? '#fbbf24' : '#3b82f6')
                                : 'rgba(255,255,255,0.3)',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'white' }
                        }}
                    />
                ))}
            </Box>

        </Box>
    );
};

export default DynamicSlides;
