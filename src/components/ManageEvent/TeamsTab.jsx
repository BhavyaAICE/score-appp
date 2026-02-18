import * as XLSX from "xlsx";

function TeamsTab({ teams = [], venues = [], onTeamsChange = () => { }, eventId }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTeam, setCurrentTeam] = useState({
    name: "",
    projectTitle: "",
    leaderName: "",
    leaderEmail: "",
    categoryId: "",
  });

  const fileInputRef = useRef(null);
  // excelScriptLoaded state is no longer needed but kept to minimize refactor if other parts depend on it, 
  // though we should set it to true immediately or remove it
  const [excelScriptLoaded, setExcelScriptLoaded] = useState(true);

  const handleAddTeam = () => {
    setCurrentTeam({
      name: "",
      projectTitle: "",
      leaderName: "",
      leaderEmail: "",
      categoryId: "",
    });
    setOpenDialog(true);
  };

  const handleSaveTeam = async () => {
    if (!currentTeam.name || !currentTeam.leaderName || !currentTeam.leaderEmail) {
      alert("Team name, leader name, and leader email are required");
      return;
    }

    try {
      const teamData = {
        event_id: eventId,
        name: currentTeam.name,
        category_id: currentTeam.categoryId || '',
        project_title: currentTeam.projectTitle || '',
        project_description: currentTeam.projectDescription || '',
        members: [{
          name: currentTeam.leaderName,
          email: currentTeam.leaderEmail,
          role: 'leader'
        }]
      };

      if (currentTeam.id) {
        await eventService.updateTeam(currentTeam.id, teamData);
      } else {
        await eventService.createTeam(teamData);
      }

      const updatedTeams = await eventService.getTeamsByEvent(eventId);
      onTeamsChange(updatedTeams);
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Failed to save team. Please try again.');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm("Are you sure you want to delete this team?")) {
      try {
        await eventService.deleteTeam(teamId);
        const updatedTeams = teams.filter((t) => t.id !== teamId);
        onTeamsChange(updatedTeams);
      } catch (error) {
        console.error('Error deleting team:', error);
        alert('Failed to delete team. Please try again.');
      }
    }
  };

  const handleClearAllTeams = async () => {
    if (teams.length === 0) {
      alert('No teams to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete all ${teams.length} team(s)? This action cannot be undone.`)) {
      try {
        await eventService.deleteAllTeams(eventId);
        onTeamsChange([]);
        alert('All teams have been deleted successfully.');
      } catch (error) {
        console.error('Error deleting all teams:', error);
        alert('Failed to delete all teams. Please try again.');
      }
    }
  };

  const handleExportPDF = () => {
    if (!window.jspdf) {
      alert("PDF generation library is not loaded.");
      console.error("jsPDF library not found on window object.");
      return;
    }
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(18);
    doc.text("Teams List", 14, 20);
    let yPosition = 40;
    doc.setFontSize(12);
    teams.forEach((team, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${index + 1}. ${team.name}`, 14, yPosition);
      yPosition += 7;
      doc.setFontSize(10);
      doc.text(`Project: ${team.projectTitle}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Leader: ${team.leaderName} (${team.leaderEmail})`, 20, yPosition);
      yPosition += 6;
      doc.text(`Category: ${team.categoryId || "N/A"}`, 20, yPosition);
      doc.setFontSize(12);
    });
    doc.save("teams.pdf");
  };

  const handleExportExcel = () => {
    const escapeCsvCell = (cell) => {
      const strCell = String(cell || '');
      if (/[",\n]/.test(strCell)) {
        const escapedCell = strCell.replace(/"/g, '""');
        return `"${escapedCell}"`;
      }
      return strCell;
    };
    const headers = ["Team Name", "Project Title", "Leader Name", "Leader Email", "Category"];
    const csvRows = [
      headers.join(','),
      ...teams.map(team => [
        escapeCsvCell(team.name),
        escapeCsvCell(team.projectTitle),
        escapeCsvCell(team.leaderName),
        escapeCsvCell(team.leaderEmail),
        escapeCsvCell(team.categoryId || 'N/A'),
      ].join(','))
    ];
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "teams.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          alert('The uploaded file appears to be empty.');
          return;
        }

        const normalizeKey = (key) => {
          return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        const normalizedFieldMapping = {
          // Team Name variations
          teamname: 'name',
          name: 'name',
          team: 'name',
          projectteam: 'name',

          // Project Title variations
          projecttitle: 'projectTitle',
          project: 'projectTitle',
          title: 'projectTitle',
          projectname: 'projectTitle',
          topic: 'projectTitle',

          // Leader Name variations
          leadername: 'leaderName',
          leader: 'leaderName',
          leadname: 'leaderName',
          teamlead: 'leaderName',
          teamleader: 'leaderName',
          studentname: 'leaderName',
          participantname: 'leaderName',
          contactname: 'leaderName',
          fullname: 'leaderName',

          // Leader Email variations
          leaderemail: 'leaderEmail',
          email: 'leaderEmail',
          leadermail: 'leaderEmail',
          mail: 'leaderEmail',
          teamleademail: 'leaderEmail',
          studentemail: 'leaderEmail',
          contactemail: 'leaderEmail',
          emailaddress: 'leaderEmail',

          // Category variations
          category: 'categoryId',
          cat: 'categoryId',
          track: 'categoryId',
          stream: 'categoryId',
          domain: 'categoryId'
        };

        const extractRowData = (row) => {
          const result = {
            name: '',
            projectTitle: '',
            leaderName: '',
            leaderEmail: '',
            categoryId: '',
          };

          for (const [key, value] of Object.entries(row)) {
            if (value === undefined || value === null || value === '') continue;

            const normalizedKey = normalizeKey(key);
            const mappedField = normalizedFieldMapping[normalizedKey];

            if (mappedField && !result[mappedField]) {
              result[mappedField] = String(value).trim();
            }
          }

          return result;
        };

        const validTeams = json.map((row, index) => {
          const teamData = extractRowData(row);
          if (!teamData.name || !teamData.leaderName || !teamData.leaderEmail) {
            console.warn(`Skipping row ${index + 2} - missing required fields. Found: ${JSON.stringify(teamData)}`);
            return null;
          }
          return teamData;
        }).filter(Boolean);

        if (validTeams.length > 0) {
          const importTeams = async () => {
            // Show loading state could be added here
            try {
              const createdTeams = [];
              for (const teamData of validTeams) {
                // Validate category against DB constraint
                const allowedCategories = ['software', 'hardware', 'Software', 'Hardware'];
                let cleanCategory = teamData.categoryId ? teamData.categoryId.trim() : null;

                // If category provided but not allowed, default to null (or we could try to map case-insensitively)
                if (cleanCategory && !allowedCategories.includes(cleanCategory)) {
                  // Try title case map
                  const lower = cleanCategory.toLowerCase();
                  if (lower === 'software') cleanCategory = 'Software';
                  else if (lower === 'hardware') cleanCategory = 'Hardware';
                  else {
                    console.warn(`Category '${cleanCategory}' is not allowed. Supported: Software, Hardware. Setting to null.`);
                    cleanCategory = null;
                  }
                } else if (cleanCategory === '') {
                  cleanCategory = null;
                }

                const newTeam = await eventService.createTeam({
                  event_id: eventId,
                  name: teamData.name,
                  category_id: cleanCategory,
                  project_title: teamData.projectTitle || '',
                  project_description: '',
                  members: [{
                    name: teamData.leaderName,
                    email: teamData.leaderEmail,
                    role: 'leader'
                  }]
                });
                createdTeams.push(newTeam);
              }

              const updatedTeams = await eventService.getTeamsByEvent(eventId);
              onTeamsChange(updatedTeams);
              alert(`Successfully imported ${createdTeams.length} team(s)`);
            } catch (error) {
              console.error('Error importing teams:', error);

              // Detailed error extraction
              let errorMessage = 'Failed to import some teams.';
              if (error.message) {
                errorMessage += `\n\nServer Error: ${error.message}`;
                if (error.message.includes('violates check constraint')) {
                  errorMessage += `\n\nHint: Check if your 'Category' column contains values other than 'Software' or 'Hardware'.`;
                }
              }
              alert(errorMessage);
            }
          };
          importTeams();
        } else {
          // Provide detailed debug info to user
          const firstRowKeys = Object.keys(json[0]);
          const detectedHeaders = firstRowKeys.map(k => `"${k}"`).join(', ');

          alert(
            `No valid teams found.\n\n` +
            `Required columns: Team Name, Leader Name, Leader Email.\n` +
            `Detected columns in your file: ${detectedHeaders}\n\n` +
            `Please rename your columns to match the required fields or use the template.`
          );
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("Error processing the file. Please ensure it's a valid Excel or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);

    event.target.value = null;
  };



  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        style={{ display: 'none' }}
        accept=".xlsx, .xls, .csv"
      />
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTeam}
          sx={{
            backgroundColor: '#6d28d9',
            '&:hover': { backgroundColor: '#5b21b6' },
            fontWeight: 'bold',
            borderRadius: '8px',
            px: 3,
            py: 1,
            textTransform: 'none',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          Add Team
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={!excelScriptLoaded}
          sx={{
            borderColor: '#d1d5db',
            color: '#4b5563',
            '&:hover': { backgroundColor: '#f9fafb', borderColor: '#9ca3af' },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {excelScriptLoaded ? 'Import Excel' : 'Loading...'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleExportPDF}
          sx={{
            borderColor: '#d1d5db',
            color: '#4b5563',
            '&:hover': { backgroundColor: '#f9fafb', borderColor: '#9ca3af' },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Export PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleExportExcel}
          sx={{
            borderColor: '#d1d5db',
            color: '#4b5563',
            '&:hover': { backgroundColor: '#f9fafb', borderColor: '#9ca3af' },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Export CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={handleClearAllTeams}
          disabled={teams.length === 0}
          sx={{
            borderColor: '#ef4444',
            color: '#ef4444',
            '&:hover': {
              backgroundColor: '#fef2f2',
              borderColor: '#dc2626'
            },
            '&:disabled': {
              borderColor: '#d1d5db',
              color: '#9ca3af',
            },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Clear All
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
            <TableRow sx={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Team Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Project Title</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Leader Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Leader Email</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Category</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b' }}>
                  No teams added yet. Click "Add Team" to get started.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => {
                const leader = team.members && team.members.length > 0 ? team.members[0] : {};
                return (
                  <TableRow key={team.id} sx={{ "&:hover": { backgroundColor: "#f8fafc" } }}>
                    <TableCell sx={{ color: "#334155", fontWeight: 500 }}>{team.name}</TableCell>
                    <TableCell sx={{ color: "#334155" }}>{team.project_title || "-"}</TableCell>
                    <TableCell sx={{ color: "#334155" }}>{leader.name || team.leaderName || "-"}</TableCell>
                    <TableCell sx={{ color: "#334155" }}>{leader.email || team.leaderEmail || "-"}</TableCell>
                    <TableCell sx={{ color: "#334155" }}>{team.category_id || team.categoryId || "Not assigned"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const editTeam = {
                            id: team.id,
                            name: team.name,
                            projectTitle: team.project_title || team.projectTitle || '',
                            projectDescription: team.project_description || team.projectDescription || '',
                            leaderName: leader.name || team.leaderName || '',
                            leaderEmail: leader.email || team.leaderEmail || '',
                            categoryId: team.category_id || team.categoryId || ''
                          };
                          setCurrentTeam(editTeam);
                          setOpenDialog(true);
                        }}
                        sx={{ color: "#3b82f6", "&:hover": { backgroundColor: "#eff6ff" } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTeam(team.id)}
                        sx={{ color: "#ef4444", "&:hover": { backgroundColor: "#fef2f2" } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentTeam.id ? "Edit Team" : "Add New Team"}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Team Name" value={currentTeam.name} onChange={(e) => setCurrentTeam({ ...currentTeam, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Project Title" value={currentTeam.projectTitle || ''} onChange={(e) => setCurrentTeam({ ...currentTeam, projectTitle: e.target.value })} margin="normal" />
          <TextField fullWidth label="Team Leader Name" value={currentTeam.leaderName} onChange={(e) => setCurrentTeam({ ...currentTeam, leaderName: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Team Leader Email" type="email" value={currentTeam.leaderEmail} onChange={(e) => setCurrentTeam({ ...currentTeam, leaderEmail: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Category" value={currentTeam.categoryId || ''} onChange={(e) => setCurrentTeam({ ...currentTeam, categoryId: e.target.value })} margin="normal" placeholder="e.g. Software, Hardware, FinTech" />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ textTransform: "none", color: "#7c3aed", fontWeight: 600, px: 3, py: 1.2, borderRadius: "10px", background: "rgba(124, 58, 237, 0.08)", "&:hover": { background: "rgba(124, 58, 237, 0.15)" } }}>
            Cancel
          </Button>
          <Button onClick={handleSaveTeam} variant="contained" sx={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", textTransform: "none", px: 4, py: 1.2, fontWeight: 700, borderRadius: "10px", boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)", transition: "all 0.3s ease", "&:hover": { background: "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.35)" } }}>
            {currentTeam.id ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
}

export default TeamsTab;

