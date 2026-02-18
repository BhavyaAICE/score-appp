import { useState, useContext } from "react";
import { AppBar, Toolbar, Typography, Box, Button, Avatar, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ThemeContext } from "../context/ThemeContext";
import { Roles } from "../services/rbacService";
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import AccessibilitySettings from "./AccessibilitySettings";

function Navigation({ breadcrumb }) {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useApp();
  const { highContrastMode } = useContext(ThemeContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showA11ySettings, setShowA11ySettings] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const userRole = userProfile?.role;
  const isAdmin = user && [Roles.SUPER_ADMIN, Roles.CO_ADMIN, Roles.EVENT_ADMIN].includes(userRole);

  const navItems = [
    ...(isAdmin ? [{ label: 'Dashboard', path: '/admin/dashboard' }] : []),
    { label: 'Events', path: '/admin/events' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Showcase', path: '/showcase' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, fontWeight: 700, color: '#2563eb' }}>
        FairScore
      </Typography>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              sx={{ textAlign: 'center' }}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {user && (
          <ListItem disablePadding>
            <ListItemButton
              sx={{ textAlign: 'center' }}
              onClick={async () => {
                await logout();
                navigate('/');
              }}
            >
              <ListItemText primary="Logout" sx={{ color: '#ef4444' }} />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        component="nav"
        position="static"
        elevation={0}
        sx={{
          backgroundColor: highContrastMode ? "#ffffff" : "white",
          borderBottom: highContrastMode ? "2px solid #000000" : "1px solid #e0e0e0",
          color: "#333",
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
        role="banner"
      >
        <Toolbar sx={{ justifyContent: "space-between", py: 1, minHeight: { xs: '56px', md: '64px' } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 3 } }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="Open navigation menu"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                  color: '#333',
                  minHeight: '44px',
                  minWidth: '44px',
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 700,
                color: "#2563eb",
                cursor: "pointer",
                fontSize: { xs: "1.25rem", md: "1.5rem" }
              }}
              onClick={() => navigate("/admin/events")}
              tabIndex={0}
              role="link"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate("/admin/events");
                }
              }}
            >
              FairScore
            </Typography>
            {breadcrumb && !isMobile && (
              <Typography
                variant="body1"
                component="nav"
                aria-label="Breadcrumb"
                sx={{
                  color: "#666",
                  fontSize: "1rem"
                }}
              >
                <span aria-hidden="true">/</span> {breadcrumb}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 2 } }}>
            {!isMobile && navItems.map((item) => (
              <Button
                key={item.label}
                onClick={() => navigate(item.path)}
                sx={{
                  color: '#333',
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: '44px',
                  '&:focus-visible': {
                    outline: '2px solid #2563eb',
                    outlineOffset: '2px',
                  }
                }}
              >
                {item.label}
              </Button>
            ))}

            <IconButton
              onClick={() => setShowA11ySettings(true)}
              aria-label="Open accessibility settings"
              sx={{
                color: '#666',
                minHeight: '44px',
                minWidth: '44px',
                '&:focus-visible': {
                  outline: '2px solid #2563eb',
                  outlineOffset: '2px',
                }
              }}
            >
              <AccessibilityNewIcon />
            </IconButton>

            {user && (
              <>
                <Box
                  onClick={() => navigate('/profile')}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    p: 0.5,
                    borderRadius: '8px',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.04)'
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate('/profile');
                    }
                  }}
                >
                  <Avatar
                    sx={{ width: 32, height: 32, bgcolor: '#e0e7ff', color: '#4f46e5' }}
                    alt={user.username || user.name || "User"}
                  >
                    <PersonOutlineOutlinedIcon fontSize="small" />
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#333",
                      fontWeight: 500
                    }}
                  >
                    {user.username || user.name || "User"}
                  </Typography>
                </Box>
                {!isMobile && (
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      await logout();
                      navigate('/');
                    }}
                    aria-label="Log out of your account"
                    sx={{
                      borderColor: "#ef4444",
                      color: "#ef4444",
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "8px",
                      px: 2.5,
                      py: 0.8,
                      minHeight: '44px',
                      borderWidth: "2px",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background: "#ef4444",
                        color: "white",
                        borderColor: "#ef4444",
                        borderWidth: "2px",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)"
                      },
                      "&:focus-visible": {
                        outline: '2px solid #ef4444',
                        outlineOffset: '2px',
                      }
                    }}
                  >
                    Logout
                  </Button>
                )}
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawer}
      </Drawer>

      <AccessibilitySettings
        isOpen={showA11ySettings}
        onClose={() => setShowA11ySettings(false)}
      />
    </>
  );
}

export default Navigation;
