/**
 * Import Service
 * Handles parsing of CSV/Excel data for score imports
 */

export const importService = {
    /**
     * Parse CSV content
     * Expected format: TeamID, [Criterion1], [Criterion2], ...
     */
    parseCSV(content, criteria) {
        const lines = content.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const results = [];
        const errors = [];

        // Map headers to criteria IDs
        const criteriaMap = {};
        criteria.forEach(c => {
            // Try to find matching header
            const index = headers.findIndex(h =>
                h === c.name.toLowerCase() ||
                h === c.id.toLowerCase()
            );
            if (index !== -1) {
                criteriaMap[c.id] = index;
            }
        });

        // Find Team ID column
        const teamIdIndex = headers.findIndex(h => h.includes('team') || h === 'id');

        if (teamIdIndex === -1) {
            return { success: false, error: 'Could not find "Team ID" or "Team" column in CSV' };
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());

            if (values.length <= teamIdIndex) continue;

            const teamId = values[teamIdIndex];
            const scores = {};

            Object.entries(criteriaMap).forEach(([cId, index]) => {
                if (values[index] && !isNaN(parseFloat(values[index]))) {
                    scores[cId] = parseFloat(values[index]);
                }
            });

            if (Object.keys(scores).length > 0) {
                results.push({
                    team_id: teamId,
                    scores
                });
            }
        }

        return {
            success: true,
            data: results,
            stats: {
                total_rows: lines.length - 1,
                parsed_count: results.length
            }
        };
    },

    /**
     * Generate a template CSV for a specific round
     */
    generateTemplate(criteria) {
        const headers = ['Team ID', 'Team Name', ...criteria.map(c => c.name)];
        return headers.join(',');
    }
};
