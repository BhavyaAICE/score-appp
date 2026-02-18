import { useState, useMemo, useEffect } from "react";
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
import AnalyticsPanel from "../components/AnalyticsPanel";

function ResultsPage() {
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
        const { data: rawData, error: rawError } = await supabase
          .from('round_evaluations')
          .select(`
            *,
            teams (name),
            judges (name)
          `)
          .limit(1000);

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
        const { data: normData, error: normError } = await supabase
          .from('round_normalization_results')
          .select(`
             *,
             teams (name)
          `)
          .limit(1000);

        if (normData) {
          setNormalizedEvaluations(normData);
        }

      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contextCategories]);

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
        // Normalized: Sum of Z-Scores (usually) or Average? 
        // If we want "Average Z-Score", we divide by count.
        // If "Total Z-Score", we just sum.
        // Typically Z-scores are additive in aggregation if we want to combine rounds.
        // But here let's Stick to Average for consistency with current UI.
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
        // For normalized, if we simply want to show the stored aggregated_z from DB?
        // DB has 'round_normalization_results' which is typically per-team-per-round.
        // If we have multiple rounds, we average/sum them.
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Results Dashboard
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
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By">
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
        >
          {sortOrder === "asc" ? "Asc" : "Desc"}
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Status</TableCell>
              {viewMode === 'raw' && categories.map((cat) => (
                <TableCell key={cat.id}>{cat.name}</TableCell>
              ))}
              <TableCell>{viewMode === 'raw' ? 'Total Avg' : 'Aggregated Z-Score'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredScores.map((score, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{score.team}</TableCell>
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
                <TableCell>{score.total.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AnalyticsPanel scores={filteredScores} />
    </Box>
  );
}

export default ResultsPage;
