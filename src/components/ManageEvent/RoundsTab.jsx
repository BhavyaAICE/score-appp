import { useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { eventService } from "../../services/eventService";

function RoundsTab({ rounds, onRoundsChange, eventId }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRound, setCurrentRound] = useState({
    name: "",
    round_number: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddRound = () => {
    setCurrentRound({ name: "", round_number: rounds.length + 1 });
    setError(null);
    setOpenDialog(true);
  };

  const handleSaveRound = async () => {
    if (!currentRound.name) {
      setError("Round name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentRound.id) {
        // Update existing round
        const updated = await eventService.updateRound(currentRound.id, {
          name: currentRound.name,
          round_number: currentRound.round_number || 1,
        });
        const updatedRounds = rounds.map((r) => 
          r.id === currentRound.id ? updated : r
        );
        updatedRounds.sort((a, b) => a.round_number - b.round_number);
        onRoundsChange(updatedRounds);
      } else {
        // Create new round
        const newRound = await eventService.createRound({
          event_id: eventId,
          name: currentRound.name,
          round_number: currentRound.round_number || rounds.length + 1,
        });
        const updatedRounds = [...rounds, newRound];
        updatedRounds.sort((a, b) => a.round_number - b.round_number);
        onRoundsChange(updatedRounds);
      }
      setOpenDialog(false);
    } catch (err) {
      console.error("Error saving round:", err);
      setError(err.message || "Failed to save round");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRound = async (roundId) => {
    if (window.confirm("Are you sure you want to delete this round?")) {
      setLoading(true);
      try {
        await eventService.deleteRound(roundId);
        onRoundsChange(rounds.filter((r) => r.id !== roundId));
      } catch (err) {
        console.error("Error deleting round:", err);
        setError(err.message || "Failed to delete round");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleAddRound}
          disabled={loading}
        >
          Create Round
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          overflow: "hidden"
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
              }}
            >
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Order</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Round Name</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rounds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No rounds created yet. Click "Create Round" to get started.
                </TableCell>
              </TableRow>
            ) : (
              rounds.map((round) => (
                <TableRow
                  key={round.id}
                  sx={{
                    "&:hover": {
                      backgroundColor: "#f8fafc"
                    }
                  }}
                >
                  <TableCell sx={{ color: "#334155", fontWeight: 600 }}>{round.round_number}</TableCell>
                  <TableCell sx={{ color: "#334155", fontWeight: 500 }}>{round.name}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCurrentRound({
                          id: round.id,
                          name: round.name,
                          round_number: round.round_number,
                        });
                        setError(null);
                        setOpenDialog(true);
                      }}
                      disabled={loading}
                      sx={{
                        color: "#3b82f6",
                        "&:hover": {
                          backgroundColor: "#eff6ff"
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRound(round.id)}
                      disabled={loading}
                      sx={{
                        color: "#ef4444",
                        "&:hover": {
                          backgroundColor: "#fef2f2"
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentRound.id ? "Edit Round" : "Create New Round"}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Round Name"
            value={currentRound.name}
            onChange={(e) => setCurrentRound({ ...currentRound, name: e.target.value })}
            margin="normal"
            required
            placeholder="e.g., Round 1, Semi-Finals, Finals"
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Order"
            type="number"
            value={currentRound.round_number}
            onChange={(e) => setCurrentRound({ ...currentRound, round_number: parseInt(e.target.value) })}
            margin="normal"
            required
            disabled={loading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenDialog(false)}
            disabled={loading}
            sx={{
              textTransform: "none",
              color: "#7c3aed",
              fontWeight: 600,
              px: 3,
              py: 1.2,
              borderRadius: "10px",
              background: "rgba(124, 58, 237, 0.08)",
              "&:hover": {
                background: "rgba(124, 58, 237, 0.15)"
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveRound}
            variant="contained"
            disabled={loading}
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              textTransform: "none",
              px: 4,
              py: 1.2,
              fontWeight: 700,
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.35)"
              }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : (currentRound.id ? "Update" : "Create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RoundsTab;