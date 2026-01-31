import React, { useState } from 'react';
import { Box, Container, Typography, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material';
import DynamicSlides from '../components/DynamicSlides';
import Navigation from '../components/Navigation';

const ShowcasePage = () => {
    const [mode, setMode] = useState('spotlight');

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setMode(newMode);
        }
    };

    const spotlightData = [
        {
            title: "EcoTrack",
            subtitle: "Sustainable Living App",
            category: "Software",
            description: "An AI-powered application that tracks individual carbon footprints and suggests personalized actionable steps to reduce environmental impact. Features include receipt scanning and gamified challenges.",
            image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
            action: true,
            onAction: () => alert("Viewing EcoTrack Details")
        },
        {
            title: "Solarify",
            subtitle: "High-Efficiency Solar Panels",
            category: "Hardware",
            description: "Next-generation solar panels utilizing perovskite cells to achieve 35% higher efficiency than traditional silicon panels. Designed for easy installation in urban environments.",
            image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
            action: true,
            onAction: () => alert("Viewing Solarify Details")
        },
        {
            title: "MedConnect",
            subtitle: "Telemedicine Platform",
            category: "Healthcare",
            description: "Bridging the gap between rural patients and urban specialists through secure, high-definition video consultations and integrated health record sharing.",
            image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
            action: true,
            onAction: () => alert("Viewing MedConnect Details")
        }
    ];

    const revealData = [
        {
            title: "Winner: EcoTrack",
            subtitle: "Grand Prize Winner",
            rank: "1st",
            score: "98.5",
            category: "Software",
            description: "Outstanding innovation in sustainability technology with potential for massive global impact.",
            image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
            action: true,
            actionLabel: "View Scoring Breakdown",
            onAction: () => alert("Viewing Scoring Breakdown")
        },
        {
            title: "Runner-up: Solarify",
            subtitle: "Best Hardware Solution",
            rank: "2nd",
            score: "96.2",
            category: "Hardware",
            description: "Revolutionary hardware design tackling the pressing energy crisis.",
            image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
            action: true,
            actionLabel: "View Scoring Breakdown",
            onAction: () => alert("Viewing Scoring Breakdown")
        },
        {
            title: "Finalist: MedConnect",
            subtitle: "Social Impact Award",
            rank: "3rd",
            score: "94.8",
            category: "Healthcare",
            description: "Highly commended for addressing critical healthcare accessibility issues.",
            image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
            action: true,
            actionLabel: "View Scoring Breakdown",
            onAction: () => alert("Viewing Scoring Breakdown")
        }
    ];

    return (
        <Box sx={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Navigation breadcrumb="Showcase" />

            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
                            {mode === 'spotlight' ? 'Project Spotlight' : 'Live Results Reveal'}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#64748b' }}>
                            {mode === 'spotlight' ? 'Browse through the amazing submissions.' : 'The moment we have all been waiting for.'}
                        </Typography>
                    </Box>

                    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', p: 0.5, borderRadius: 2 }}>
                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={handleModeChange}
                            aria-label="slide mode"
                            size="small"
                        >
                            <ToggleButton value="spotlight" sx={{ px: 3, fontWeight: 600 }}>
                                Spotlight
                            </ToggleButton>
                            <ToggleButton value="reveal" sx={{ px: 3, fontWeight: 600 }}>
                                Reveal
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Paper>
                </Box>

                <DynamicSlides
                    slides={mode === 'spotlight' ? spotlightData : revealData}
                    mode={mode}
                    autoPlay={false}
                />

                <Box sx={{ mt: 8, textAlign: 'center', maxWidth: '600px', mx: 'auto' }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Instructions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Use the toggle above to switch between "Spotlight Mode" (for project galleries) and "Reveal Mode" (for announcing winners).
                        The animations and styles automatically adapt to provide the best experience for each context.
                    </Typography>
                </Box>

            </Container>
        </Box>
    );
};

export default ShowcasePage;
