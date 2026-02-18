import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Typography,
    Card,
    Avatar,
    Divider,
    Chip,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress,
    Alert
} from "@mui/material";
import { useApp } from "../context/AppContext";
import Navigation from "../components/Navigation";
import { authService } from "../services/authService";
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

function UserProfile() {
    const { user, refreshProfile, logout } = useApp();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setEditName(user.username || "");
        }
    }, [user]);

    if (!user) {
        return null;
    }

    const handleUpdateProfile = async () => {
        if (!editName.trim()) {
            setError("Name cannot be empty");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await authService.updateProfile({ full_name: editName });

            if (result.success) {
                setIsEditing(false);
                await refreshProfile();
            } else {
                setError(result.error || "Failed to update profile");
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            const result = await authService.deleteAccount();
            if (result.success) {
                // AppContext should handle the auth state change automatically, 
                // but calling logout ensures local state is cleared
                await logout();
                navigate('/');
            } else {
                setError(result.error || "Failed to delete account");
                setDeleteDialogOpen(false);
            }
        } catch (err) {
            setError(err.message);
            setDeleteDialogOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", background: "#f5f7fa" }}>
            <Navigation breadcrumb="Profile" />

            <Box sx={{ maxWidth: "800px", mx: "auto", px: 4, py: 6 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#1e293b", mb: 4 }}>
                    My Profile
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Card sx={{
                    p: 5,
                    borderRadius: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                    border: "1px solid #e2e8f0",
                    background: "white"
                }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 3 }}>
                        <Avatar
                            sx={{
                                width: 100,
                                height: 100,
                                bgcolor: '#e0e7ff',
                                color: '#4f46e5',
                                fontSize: "3rem"
                            }}
                        >
                            {user.username ? user.username[0].toUpperCase() : <PersonOutlineOutlinedIcon fontSize="inherit" />}
                        </Avatar>

                        <Box sx={{ flex: 1 }}>
                            {isEditing ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <TextField
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        label="Full Name"
                                        variant="outlined"
                                        size="small"
                                        autoFocus
                                        disabled={loading}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleUpdateProfile}
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                        disabled={loading}
                                        sx={{ bgcolor: "#7c3aed", '&:hover': { bgcolor: "#6d28d9" } }}
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditName(user.username || "");
                                            setError(null);
                                        }}
                                        startIcon={<CancelIcon />}
                                        disabled={loading}
                                        color="inherit"
                                    >
                                        Cancel
                                    </Button>
                                </Box>
                            ) : (
                                <Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                            {user.username || "User"}
                                        </Typography>
                                        <IconButtonWithTooltip title="Edit Name" onClick={() => setIsEditing(true)}>
                                            <EditIcon fontSize="small" sx={{ color: "#64748b" }} />
                                        </IconButtonWithTooltip>
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 1 }}>
                                        <Chip
                                            label={user.role || "User"}
                                            size="small"
                                            sx={{
                                                bgcolor: user.role === 'admin' ? '#fef3c7' : '#e0e7ff',
                                                color: user.role === 'admin' ? '#d97706' : '#4f46e5',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                fontSize: '0.75rem'
                                            }}
                                        />
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ display: 'grid', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: '12px',
                                bgcolor: '#f1f5f9',
                                color: '#64748b'
                            }}>
                                <BadgeOutlinedIcon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    Username / Display Name
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                                    {user.username}
                                </Typography>
                            </Box>
                        </Box>

                        {user.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: '12px',
                                    bgcolor: '#f1f5f9',
                                    color: '#64748b'
                                }}>
                                    <EmailOutlinedIcon />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                        Email Address
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                                        {user.email}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: '12px',
                                bgcolor: '#f1f5f9',
                                color: '#64748b'
                            }}>
                                <PersonOutlineOutlinedIcon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    Role
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155', textTransform: 'capitalize' }}>
                                    {user.role}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ mt: 6, pt: 4, borderTop: "1px dashed #e2e8f0" }}>
                        <Typography variant="h6" sx={{ color: "#ef4444", fontSize: "1.1rem", mb: 1, fontWeight: 600 }}>
                            Danger Zone
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
                            Once you delete your account, there is no going back. Please be certain.
                        </Typography>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteForeverIcon />}
                            onClick={() => setDeleteDialogOpen(true)}
                            sx={{
                                borderColor: "#fee2e2",
                                color: "#ef4444",
                                '&:hover': { bgcolor: "#fef2f2", borderColor: "#ef4444" }
                            }}
                        >
                            Delete Account
                        </Button>
                    </Box>
                </Card>
            </Box>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title" sx={{ color: "#ef4444", fontWeight: 700 }}>
                    {"Delete User Account?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently remove your profile and access to the system.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="primary" disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteAccount} color="error" variant="contained" autoFocus disabled={loading}>
                        {loading ? "Deleting..." : "Yes, Delete My Account"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Helper component
const IconButtonWithTooltip = ({ title, onClick, children }) => {
    return (
        <Box
            component="button"
            onClick={onClick}
            title={title}
            sx={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                p: 1,
                borderRadius: "50%",
                display: "flex",
                '&:hover': { bgcolor: "rgba(0,0,0,0.05)" }
            }}
        >
            {children}
        </Box>
    );
};

export default UserProfile;
