import { useState, useMemo, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useApp } from "../context/AppContext";
import { supabase } from "../supabaseClient";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress
} from "@mui/material";
import Navigation from '../components/Navigation';
import AnalyticsPanel from "../components/AnalyticsPanel";

function AdminResults() {
  const { eventId } = useParams();
  const { categories: contextCategories } = useApp();
  const [categories, setCategories] = useState(contextCategories || []);
  const [rawEvaluations, setRawEvaluations] = useState([]);
  const [normalizedEvaluations, setNormalizedEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("total");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("raw"); // 'raw' | 'normalized'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Categories if missing
        if (!contextCategories || contextCategories.length === 0) {
          const { data: cats } = await supabase.from('criteria').select('*');
          if (cats) setCategories(cats);
        }

        // Fetch Raw Evaluations
        // Note: For AdminResults we might want to filter by eventId if possible, 
        // but round_evaluations link to rounds -> events.
        // For simplicity and speed, we will fetch round_evaluations where round.event_id = eventId

        const { data: rounds } = await supabase.from('rounds').select('id').eq('event_id', eventId);
        const roundIds = rounds?.map(r => r.id) || [];

        if (roundIds.length > 0) {
          const { data: rawData } = await supabase
            .from('round_evaluations')
            .select(`
                *,
                teams (name),
                judges (name)
            `)
            .in('round_id', roundIds);

          if (rawData) {
            const formatted = rawData.map(item => ({
              ...item,
              team: item.teams?.name || 'Unknown Team',
              teamId: item.team_id,
              judge: item.judges?.name,
              total: item.raw_total || 0,
              scores: item.scores || {}
            }));
            setRawEvaluations(formatted);
          }

          // Fetch Normalized Results
          const { data: normData } = await supabase
            .from('round_normalization_results')
            .select(`
                *,
                teams (name)
            `)
            .in('round_id', roundIds);

          if (normData) {
            setNormalizedEvaluations(normData);
          }
        }

      } catch (err) {
        console.error("Error fetching admin results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, contextCategories]);

  // Aggregate scores by team
  const aggregatedScores = useMemo(() => {
    const sourceData = viewMode === 'raw' ? rawEvaluations : normalizedEvaluations;
    const agg = {};

    sourceData.forEach((item) => {
      if (!agg[item.teamId || item.team_id]) {
        agg[item.teamId || item.team_id] = {
          team: item.team || item.teams?.name || 'Unknown',
          scores: {},
          count: 0,
          total: 0
        };
      }

      const teamAgg = agg[item.teamId || item.team_id];
      teamAgg.count += 1;

      if (viewMode === 'raw') {
        // Raw: Average the scores across judges
        categories.forEach((cat) => {
          if (!teamAgg.scores[cat.name]) {
            teamAgg.scores[cat.name] = 0;
          }
          teamAgg.scores[cat.name] += Number(item.scores[cat.id] || 0);
        });
        teamAgg.total += item.total;
      } else {
        teamAgg.total += (item.z_score || item.aggregated_z || 0);
      }
    });

    // Finalize averages
    Object.keys(agg).forEach((teamId) => {
      const teamAgg = agg[teamId];
      if (viewMode === 'raw') {
        categories.forEach((cat) => {
          teamAgg.scores[cat.name] /= teamAgg.count;
        });
        teamAgg.total /= teamAgg.count;
      } else {
        teamAgg.total /= teamAgg.count;
      }
    });

    return Object.values(agg);
  }, [rawEvaluations, normalizedEvaluations, categories, viewMode]);

  // Filter and sort
  const filteredScores = useMemo(() => {
    let filtered = aggregatedScores.filter((score) =>
      score.team.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    return filtered;
  }, [aggregatedScores, searchTerm, sortBy, sortOrder]);

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Navigation breadcrumb="Dashboard / Results" />

      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: 4, py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b' }}>
          Event Results (Admin View)
        </Typography>

        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            color="primary"
            value={viewMode}
            exclusive
            onChange={(e, newMode) => {
              if (newMode) setViewMode(newMode);
            }}
            aria-label="Result View Mode"
          >
            <ToggleButton value="raw">Raw Marks</ToggleButton>
            <ToggleButton value="normalized">Normalized (Z-Score)</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            label="Search Team"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ bgcolor: 'white' }}
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By" sx={{ bgcolor: 'white' }}>
              <MenuItem value="total">Total Score</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            sx={{ bgcolor: 'white' }}
          >
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Team</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                {viewMode === 'raw' && categories.map((cat) => (
                  <TableCell key={cat.id} sx={{ fontWeight: 600 }}>{cat.name}</TableCell>
                ))}
                <TableCell sx={{ fontWeight: 600 }}>{viewMode === 'raw' ? 'Total Avg' : 'Aggregated Z-Score'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScores.map((score, index) => (
                <TableRow key={index} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{score.team}</TableCell>
                  <TableCell>
                    <span style={{
                      color: score.total > 0 ? 'green' : 'red',
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}>
                      {score.total > 0 ? "Present" : "Absent"}
                    </span>
                  </TableCell>
                  {viewMode === 'raw' && categories.map((cat) => (
                    <TableCell key={cat.id}>{score.scores[cat.name]?.toFixed(2)}</TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 600 }}>{score.total.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 4 }}>
          <AnalyticsPanel scores={filteredScores} />
        </Box>
      </Box>
    </Box>
  );
}

export default AdminResults;
