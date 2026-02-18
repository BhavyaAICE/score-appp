import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { eventService } from '../services/eventService';

export const exportService = {
    async exportEventData(eventId) {
        try {
            const zip = new JSZip();

            // Fetch all data
            const event = await eventService.getEvent(eventId);
            const teams = await eventService.getTeamsByEvent(eventId);
            const judges = await eventService.getJudgesByEvent(eventId);
            const criteria = await eventService.getCriteriaByEvent(eventId);
            const rounds = await eventService.getRoundsByEvent(eventId);
            const scores = await eventService.getScoresByEvent(eventId);

            // Create folder for event
            const folderName = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data`;
            const folder = zip.folder(folderName);

            // 1. Event Details (JSON & Text)
            folder.file('event_details.json', JSON.stringify(event, null, 2));
            folder.file('README.txt', `
Event: ${event.name}
Description: ${event.description || 'N/A'}
Date: ${new Date(event.start_date).toLocaleDateString()} - ${new Date(event.end_date).toLocaleDateString()}
Status: ${event.status}
Deleted At: ${event.deleted_at ? new Date(event.deleted_at).toLocaleString() : 'N/A'}

This archive contains all data associated with this event at the time of deletion.
      `.trim());

            // 2. Teams (CSV)
            const teamsHeader = ['ID', 'Name', 'Members', 'Project Description', 'Is Absent'];
            const teamsRows = teams.map(t => [
                t.id,
                t.name,
                t.members || '',
                t.project_description || '',
                t.is_absent ? 'Yes' : 'No'
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
            folder.file('teams.csv', [teamsHeader.join(','), ...teamsRows].join('\n'));

            // 3. Judges (CSV)
            const judgesHeader = ['ID', 'Name', 'Email', 'Role'];
            const judgesRows = judges.map(j => [
                j.id,
                j.name,
                j.email,
                j.role
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
            folder.file('judges.csv', [judgesHeader.join(','), ...judgesRows].join('\n'));

            // 4. Scores (CSV)
            // Flatten scores to be readable: Judge Name, Team Name, Round, Criterion, Score, Comment
            const scoresHeader = ['Judge ID', 'Team ID', 'Round', 'Criterion Key', 'Score', 'Comment'];
            const scoresRows = scores.map(s => [
                s.judge_id,
                s.team_id,
                s.round,
                s.criterion_key,
                s.score,
                s.comment || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
            folder.file('raw_scores.csv', [scoresHeader.join(','), ...scoresRows].join('\n'));

            // 5. Criteria (JSON for reference)
            folder.file('criteria_schema.json', JSON.stringify(criteria, null, 2));

            // Generate Zip
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${folderName}.zip`);

            return { success: true };
        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, error: error.message };
        }
    }
};
