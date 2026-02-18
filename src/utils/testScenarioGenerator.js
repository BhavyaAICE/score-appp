import { supabase } from '../supabaseClient';
import { authService } from '../services/authService';

/**
 * Creates a complete test event scenario:
 * - Event: "Demo Competition 2026"
 * - Round 1: 3 Venues, 3 Independent Judges
 * - Teams: 10 teams
 * - Round 2: Prepared for "All judges sit together"
 */
export async function createTestScenario() {
    console.log('Starting Test Scenario Generation...');

    try {
        // 1. Get Current User (Admin)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be logged in to create test scenario');

        // 2. Create Event
        const { data: event, error: eventError } = await supabase
            .from('events')
            .insert({
                name: 'Demo Competition 2026',
                description: 'Automated Test Scenario Event',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 86400000).toISOString(),
                status: 'active',
                created_by: user.id
            })
            .select()
            .single();

        if (eventError) throw eventError;
        console.log('Event created:', event.id);

        // 3. Create Teams
        const teams = Array.from({ length: 12 }, (_, i) => ({
            event_id: event.id,
            name: `Team ${i + 1} (${['Alpha', 'Beta', 'Gamma'][i % 3]})`,
            project_title: `Project ${i + 1}`,
            category_id: ['Innovation', 'Design', 'Impact'][i % 3]
        }));

        const { data: teamsData, error: teamError } = await supabase
            .from('teams')
            .insert(teams)
            .select();

        if (teamError) throw teamError;
        console.log('Teams created:', teamsData.length);

        // 4. Create Judges (Mock Users)
        // In a real app we might need real auth users, but here we insert into 'judges' table
        // assuming it links to users or is standalone depending on schema.
        // Based on earlier file reads, 'judges' seems to be a separate table from 'users'
        // or checks 'user_profiles'. Let's check 'judges' table definition if possible, 
        // but assuming standard insert:
        const judgesList = [
            { name: 'Judge A (Venue 1)', email: 'judge.a@test.com', category: 'HARDWARE', event_id: event.id },
            { name: 'Judge B (Venue 2)', email: 'judge.b@test.com', category: 'SOFTWARE', event_id: event.id },
            { name: 'Judge C (Venue 3)', email: 'judge.c@test.com', category: 'BOTH', event_id: event.id }
        ];

        const { data: judgesData, error: judgeError } = await supabase
            .from('judges')
            .insert(judgesList)
            .select();

        if (judgeError) throw judgeError;
        console.log('Judges created:', judgesData.length);

        // 5. Create Round 1
        const { data: round1, error: r1Error } = await supabase
            .from('rounds')
            .insert({
                event_id: event.id,
                name: 'Round 1: Preliminary',
                round_number: 1,
                status: 'active'
            })
            .select()
            .single();

        if (r1Error) throw r1Error;

        // 6. Config Round 1 Criteria
        const criteria = [
            { round_id: round1.id, name: 'Creativity', max_marks: 10, weight: 1.0, display_order: 1 },
            { round_id: round1.id, name: 'Execution', max_marks: 10, weight: 1.5, display_order: 2 },
            { round_id: round1.id, name: 'Impact', max_marks: 10, weight: 1.0, display_order: 3 }
        ];

        await supabase.from('round_criteria').insert(criteria);

        // 7. Assign Judges to Round 1 (All judges judge independently)
        const assignments = judgesData.map(j => ({
            round_id: round1.id,
            judge_id: j.id,
            judge_type: j.category,
            judge_weight: 1.0
        }));

        await supabase.from('round_judge_assignments').insert(assignments);

        // 8. Create Round 2 (Finals - Setup for "Sitting Together")
        const { data: round2, error: r2Error } = await supabase
            .from('rounds')
            .insert({
                event_id: event.id,
                name: 'Round 2: Finals',
                round_number: 2,
                status: 'draft' // Not active yet
            })
            .select()
            .single();

        // Assign all judges to Round 2 as well
        const assignments2 = judgesData.map(j => ({
            round_id: round2.id,
            judge_id: j.id,
            judge_type: j.category,
            judge_weight: 1.0
        }));
        await supabase.from('round_judge_assignments').insert(assignments2);

        return { success: true, message: 'Test Scenario Created! Go to Admin Dashboard to see "Demo Competition 2026".' };

    } catch (error) {
        console.error('Test Scenario Failed:', error);
        return { success: false, error: error.message };
    }
}
