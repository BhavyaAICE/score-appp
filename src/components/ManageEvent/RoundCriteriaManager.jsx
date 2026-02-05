import { useState, useEffect } from "react";
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
  Typography,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";
import { roundService } from "../../services/roundService";
import { eventService } from "../../services/eventService";

function RoundCriteriaManager({ round, onClose }) {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentCriterion, setCurrentCriterion] = useState({
    name: "",
    description: "",
    max_marks: 10,
    weight: 1,
    display_order: 1,
  });

  useEffect(() => {
    loadCriteria();
  }, [round.id]);

  const loadCriteria = async () => {
    setLoading(true);
    try {
      const data = await roundService.getRoundCriteria(round.id);
      setCriteria(data);
    } catch (err) {
      console.error("Error loading criteria:", err);
      setError("Failed to load criteria");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCriterion = () => {
    setCurrentCriterion({
      name: "",
      description: "",
      max_marks: 10,
      weight: 1,
      display_order: criteria.length + 1,
    });
    setError(null);
    setOpenDialog(true);
  };

  const handleEditCriterion = (criterion) => {
    setCurrentCriterion({ ...criterion });
    setError(null);
    setOpenDialog(true);
  };

  const handleSaveCriterion = async () => {
    if (!currentCriterion.name) {
      setError("Criterion name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (currentCriterion.id) {
        await roundService.updateRoundCriterion(currentCriterion.id, {
          name: currentCriterion.name,
          description: currentCriterion.description,
          max_marks: currentCriterion.max_marks,
          weight: currentCriterion.weight,
          display_order: currentCriterion.display_order,
        });
      } else {
        await roundService.createRoundCriterion(round.id, {
          name: currentCriterion.name,
          description: currentCriterion.description,
          max_marks: currentCriterion.max_marks,
          weight: currentCriterion.weight,
          display_order: currentCriterion.display_order,
        });
      }
      await loadCriteria();
      setOpenDialog(false);
    } catch (err) {
      console.error("Error saving criterion:", err);
      setError(err.message || "Failed to save criterion");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCriterion = async (criterionId) => {
    if (!window.confirm("Are you sure you want to delete this criterion?")) {
      return;
    }

    setLoading(true);
    try {
      await roundService.deleteRoundCriterion(criterionId);
      await loadCriteria();
    } catch (err) {
      console.error("Error deleting criterion:", err);
      setError(err.message || "Failed to delete criterion");
    } finally {
      setLoading(false);
    }
  };

  const totalMaxMarks = criteria.reduce((sum, c) => sum + (c.max_marks || 0), 0);
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const handleSyncFromEvent = async () => {
    if (criteria.length > 0) {
      if (!window.confirm("This will append the event's default criteria to the current list. Continue?")) {
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Fetch event criteria
      const eventCriteria = await eventService.getCriteriaByEvent(round.event_id);

      if (!eventCriteria || eventCriteria.length === 0) {
        setError("No default criteria found for this event. Add them in the Criteria tab first.");
        setLoading(false);
        return;
      }

      // 2. Add each to round
      // We process sequentially to ensure order is preserved (though Promis.all is faster, sequential is safer for order if backend relies on insertion time)
      let addedCount = 0;
      for (const ec of eventCriteria) {
        // Standardize weight/marks
        await roundService.createRoundCriterion(round.id, {
          name: ec.name,
          description: ec.description,
          max_marks: ec.max_marks || 10,
          weight: ec.weight || 1.0,
          display_order: criteria.length + addedCount + 1
        });
        addedCount++;
      }

      await loadCriteria();
      setError(null);
    } catch (err) {
      console.error("Sync error:", err);
      setError("Failed to sync criteria: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">
            Manage Criteria - {round.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Define scoring criteria for this round
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${criteria.length} criteria`} size="small" />
          <Chip label={`${totalMaxMarks} total marks`} size="small" color="primary" />
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCriterion}
            disabled={loading || round.status === 'completed'}
          >
            Add Criterion
          </Button>
          <Tooltip title="Import criteria defined in the main Event Settings">
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={handleSyncFromEvent}
              disabled={loading || round.status === 'completed'}
            >
              Sync from Event Defaults
            </Button>
          </Tooltip>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : criteria.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
            <Typography color="textSecondary">
              No criteria defined yet. Add criteria to enable scoring for this round.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, width: 50 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Criterion</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>Max Marks</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 80 }}>Weight</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {criteria.map((criterion) => (
                  <TableRow key={criterion.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DragIcon sx={{ color: '#9ca3af', cursor: 'grab' }} />
                        {criterion.display_order}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {criterion.name}
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {criterion.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip label={criterion.max_marks} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`×${criterion.weight}`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditCriterion(criterion)}
                        disabled={round.status === 'completed'}
                        sx={{ color: "#3b82f6" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCriterion(criterion.id)}
                        disabled={round.status === 'completed' || round.status === 'active'}
                        sx={{ color: "#ef4444" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {criteria.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f9ff', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Summary
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {criteria.length} criteria • Total max marks: {totalMaxMarks} • Total weight: {totalWeight}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Add/Edit Criterion Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentCriterion.id ? "Edit Criterion" : "Add Criterion"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Criterion Name"
            value={currentCriterion.name}
            onChange={(e) => setCurrentCriterion({ ...currentCriterion, name: e.target.value })}
            margin="normal"
            required
            placeholder="e.g., Technical Implementation"
          />
          <TextField
            fullWidth
            label="Description"
            value={currentCriterion.description || ""}
            onChange={(e) => setCurrentCriterion({ ...currentCriterion, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            placeholder="Brief description of what judges should evaluate"
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              label="Max Marks"
              type="number"
              value={currentCriterion.max_marks}
              onChange={(e) => setCurrentCriterion({ ...currentCriterion, max_marks: parseInt(e.target.value) || 0 })}
              margin="normal"
              inputProps={{ min: 1, max: 100 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Weight"
              type="number"
              value={currentCriterion.weight}
              onChange={(e) => setCurrentCriterion({ ...currentCriterion, weight: parseFloat(e.target.value) || 1 })}
              margin="normal"
              inputProps={{ min: 0.1, max: 10, step: 0.1 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Order"
              type="number"
              value={currentCriterion.display_order}
              onChange={(e) => setCurrentCriterion({ ...currentCriterion, display_order: parseInt(e.target.value) || 1 })}
              margin="normal"
              inputProps={{ min: 1 }}
              sx={{ flex: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveCriterion} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

export default RoundCriteriaManager;
