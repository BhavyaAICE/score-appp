import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DownloadIcon from '@mui/icons-material/Download';
import Navigation from "../components/Navigation";
import { eventService } from "../services/eventService";
import { exportService } from "../utils/exportUtils";
import { createTestScenario } from "../utils/testScenarioGenerator";

function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [currentEvent, setCurrentEvent] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadEvents();
  }, [showRecycleBin]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      if (showRecycleBin) {
        const deletedEvents = await eventService.getDeletedEvents();

        // Check for retention policy (30 days) and auto-delete
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        const eventsToKeep = [];
        for (const event of deletedEvents) {
          const deletedDate = new Date(event.deleted_at);
          if (deletedDate < thirtyDaysAgo) {
            console.log(`Auto-deleting expired event: ${event.name} (Deleted: ${deletedDate})`);
            try {
              await eventService.permanentlyDeleteEvent(event.id);
            } catch (err) {
              console.error(`Failed to auto-delete event ${event.id}`, err);
              // Keep it in list if failed to delete so user sees it
              eventsToKeep.push(event);
            }
          } else {
            eventsToKeep.push(event);
          }
        }
        setEvents(eventsToKeep);
      } else {
        const eventsData = await eventService.getAllEvents();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setCurrentEvent({ name: "", description: "", startDate: "", endDate: "" });
    setOpenDialog(true);
  };

  const handleSaveEvent = async () => {
    if (!currentEvent.name) {
      alert("Event name is required");
      return;
    }

    try {
      const eventData = {
        name: currentEvent.name,
        description: currentEvent.description || '',
        start_date: currentEvent.startDate || null,
        end_date: currentEvent.endDate || null,
        status: "draft",
      };

      if (currentEvent.id) {
        await eventService.updateEvent(currentEvent.id, eventData);
      } else {
        await eventService.createEvent(eventData);
      }

      await loadEvents();
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to move this event to the recycle bin?")) {
      try {
        await eventService.deleteEvent(eventId);
        await loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        // Check for Postgres error "undefined_column" (code 42703) or message text
        if (error.code === '42703' || (error.message && error.message.includes('deleted_at'))) {
          if (window.confirm("Recycle Bin is not enabled yet (database update missing). Do you want to permanently delete this event instead?")) {
            try {
              await eventService.permanentlyDeleteEvent(eventId);
              await loadEvents();
            } catch (permError) {
              console.error('Error permanently deleting:', permError);
              alert('Failed to permanently delete event: ' + permError.message);
            }
          }
        } else {
          alert('Failed to delete event: ' + (error.message || 'Unknown error'));
        }
      }
    }
  };

  const handleRestoreEvent = async (eventId) => {
    try {
      await eventService.restoreEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error('Error restoring event:', error);
      alert('Failed to restore event. Please try again.');
    }
  };

  const handlePermanentDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to PERMANENTLY delete this event? This action cannot be undone.")) {
      try {
        await eventService.permanentlyDeleteEvent(eventId);
        await loadEvents();
      } catch (error) {
        console.error('Error permanently deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleManageEvent = (eventId) => {
    navigate(`/admin/event/${eventId}`);
  };

  const handleDownloadZip = async (eventId) => {
    try {
      setLoading(true);
      await exportService.exportEventData(eventId);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download event data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestScenario = async () => {
    if (window.confirm("Generate a complete test scenario (Demo Competition 2026)? This will create an event, teams, rounds, and judges.")) {
      setLoading(true);
      const result = await createTestScenario();
      setLoading(false);

      if (result.success) {
        alert(result.message);
        loadEvents();
      } else {
        alert("Error: " + result.error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)" }}>
      <Navigation />

      <Box sx={{ maxWidth: "1400px", mx: "auto", px: 4, py: 8 }}>
        <Box sx={{ mb: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1.5,
                fontSize: "2.75rem"
              }}
            >
              {showRecycleBin ? "Recycle Bin" : "My Events"}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#64748b",
                fontSize: "1.15rem",
                fontWeight: 500
              }}
            >
              {showRecycleBin ? "Manage deleted events" : "Manage your hackathons and competitions"}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant={showRecycleBin ? "contained" : "outlined"}
              onClick={() => setShowRecycleBin(!showRecycleBin)}
              color={showRecycleBin ? "secondary" : "primary"}
              startIcon={showRecycleBin ? <Box component="span" sx={{ fontSize: '1.2rem' }}>←</Box> : <DeleteIcon />}
              sx={{
                textTransform: "none",
                px: 3,
                py: 1.75,
                fontSize: "1.05rem",
                fontWeight: 600,
                borderRadius: "12px",
                borderColor: showRecycleBin ? "transparent" : "#64748b",
                color: showRecycleBin ? "white" : "#64748b",
                background: showRecycleBin ? "#64748b" : "transparent",
                "&:hover": {
                  background: showRecycleBin ? "#475569" : "rgba(100, 116, 139, 0.08)",
                  borderColor: showRecycleBin ? "transparent" : "#475569",
                  color: showRecycleBin ? "white" : "#475569",
                }
              }}
            >
              {showRecycleBin ? "Back to Events" : "Recycle Bin"}
            </Button>

            {!showRecycleBin && (
              <Button
                variant="contained"
                onClick={handleCreateEvent}
                sx={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                  color: "white",
                  textTransform: "none",
                  px: 4,
                  py: 1.75,
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 20px rgba(124, 58, 237, 0.4)"
                  }
                }}
              >
                + Create Event
              </Button>
            )}
          </Box>
        </Box>

        {/* Test Scenario Trigger */}
        {!showRecycleBin && (
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={handleGenerateTestScenario}
              sx={{ color: '#64748b', textTransform: 'none', fontSize: '0.9rem' }}
            >
              🛠️ Generate Test Scenario Data
            </Button>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={60} sx={{ color: '#7c3aed' }} />
          </Box>
        ) : events.length === 0 ? (
          <Card
            sx={{
              p: 10,
              textAlign: "center",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
              border: "1px solid rgba(124, 58, 237, 0.1)"
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: "#1e293b",
                fontWeight: 700,
                mb: 2
              }}
            >
              {showRecycleBin ? "Recycle Bin Empty" : "No Events Yet"}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#64748b",
                mb: 5,
                fontSize: "1.1rem",
                maxWidth: "500px",
                mx: "auto"
              }}
            >
              {showRecycleBin
                ? "No deleted events found."
                : "Create your first event to get started with fair, automated judging"}
            </Typography>
            {!showRecycleBin && (
              <Button
                variant="contained"
                onClick={handleCreateEvent}
                sx={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                  color: "white",
                  textTransform: "none",
                  px: 5,
                  py: 2,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 20px rgba(124, 58, 237, 0.4)"
                  }
                }}
              >
                Create Your First Event
              </Button>
            )}
          </Card>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {events.map((event) => (
              <Card
                key={event.id}
                sx={{
                  width: "360px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #ffffff 0%, #fefefe 100%)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  transition: "all 0.3s ease",
                  border: "1px solid rgba(124, 58, 237, 0.1)",
                  opacity: showRecycleBin ? 0.9 : 1,
                  "&:hover": {
                    boxShadow: "0 12px 35px rgba(124, 58, 237, 0.2)",
                    transform: "translateY(-4px)",
                    borderColor: "rgba(124, 58, 237, 0.3)"
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: "#1e293b",
                        fontSize: "1.4rem"
                      }}
                    >
                      {event.name}
                    </Typography>
                    <Chip
                      label={event.status}
                      size="small"
                      sx={{
                        background: "linear-gradient(135deg, #ddd6fe 0%, #e0e7ff 100%)",
                        color: "#5b21b6",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: "26px",
                        px: 1
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        mb: 0.5
                      }}
                    >
                      <strong style={{ color: "#475569" }}>Start:</strong> {formatDate(event.start_date || event.startDate)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}
                    >
                      <strong style={{ color: "#475569" }}>End:</strong> {formatDate(event.end_date || event.endDate)}
                    </Typography>
                    {showRecycleBin && event.deleted_at && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#ef4444",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          mt: 1
                        }}
                      >
                        Deleted: {new Date(event.deleted_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    {showRecycleBin ? (
                      <>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleRestoreEvent(event.id)}
                          startIcon={<RestoreFromTrashIcon />}
                          sx={{
                            background: "#22c55e",
                            color: "white",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            py: 1.3,
                            fontSize: "0.95rem",
                            boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              background: "#16a34a",
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.35)"
                            }
                          }}
                        >
                          Restore
                        </Button>
                        <Tooltip title="Delete Permanently">
                          <IconButton
                            onClick={() => handlePermanentDelete(event.id)}
                            sx={{
                              color: "#ef4444",
                              background: "rgba(239, 68, 68, 0.1)",
                              borderRadius: "10px",
                              width: "48px",
                              "&:hover": {
                                background: "#ef4444",
                                color: "white"
                              }
                            }}
                          >
                            <DeleteForeverIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download Data">
                          <IconButton
                            onClick={() => handleDownloadZip(event.id)}
                            sx={{
                              color: "#3b82f6",
                              background: "rgba(59, 130, 246, 0.1)",
                              borderRadius: "10px",
                              width: "48px",
                              "&:hover": {
                                background: "#3b82f6",
                                color: "white"
                              }
                            }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleManageEvent(event.id)}
                          sx={{
                            background: "#3b82f6",
                            color: "white",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            py: 1.3,
                            fontSize: "0.95rem",
                            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              background: "#2563eb",
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.35)"
                            }
                          }}
                        >
                          Manage Event
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => handleDeleteEvent(event.id)}
                          sx={{
                            background: "#ef4444",
                            color: "white",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            px: 3,
                            py: 1.3,
                            minWidth: "auto",
                            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              background: "#dc2626",
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)"
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              p: 1,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: "1.75rem", color: "#1e293b" }}>
            {currentEvent.id ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Event Name"
              value={currentEvent.name}
              onChange={(e) => setCurrentEvent({ ...currentEvent, name: e.target.value })}
              margin="normal"
              required
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": {
                    borderColor: "#7c3aed",
                    borderWidth: "2px"
                  }
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#7c3aed"
                }
              }}
            />
            <TextField
              fullWidth
              label="Event Description"
              value={currentEvent.description}
              onChange={(e) => setCurrentEvent({ ...currentEvent, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": {
                    borderColor: "#7c3aed",
                    borderWidth: "2px"
                  }
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#7c3aed"
                }
              }}
            />
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={currentEvent.startDate}
              onChange={(e) => setCurrentEvent({ ...currentEvent, startDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": {
                    borderColor: "#7c3aed",
                    borderWidth: "2px"
                  }
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#7c3aed"
                }
              }}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={currentEvent.endDate}
              onChange={(e) => setCurrentEvent({ ...currentEvent, endDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  "&.Mui-focused fieldset": {
                    borderColor: "#7c3aed",
                    borderWidth: "2px"
                  }
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#7c3aed"
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
            <Button
              onClick={() => setOpenDialog(false)}
              sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: 600,
                px: 3,
                py: 1.2,
                borderRadius: "10px",
                "&:hover": {
                  background: "#f1f5f9"
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              variant="contained"
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
              {currentEvent.id ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box >
  );
}

export default EventList;
