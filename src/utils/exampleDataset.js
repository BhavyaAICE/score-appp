/**
 * Example Dataset Generator
 * Creates realistic test data for the judging system
 */

export function generateExampleDataset() {
  const eventId = 'example-event-001';

  const event = {
    id: eventId,
    name: 'Tech Innovation Challenge 2024',
    description: 'Annual technology innovation competition',
    status: 'active',
    start_date: new Date('2024-03-01').toISOString(),
    end_date: new Date('2024-03-15').toISOString()
  };

  const teams = [
    {
      id: 'team-001',
      event_id: eventId,
      name: 'Team Alpha',
      category_id: 'Software',
      project_title: 'AI-Powered Healthcare Assistant',
      project_description: 'An intelligent system for patient diagnosis support'
    },
    {
      id: 'team-002',
      event_id: eventId,
      name: 'Team Beta',
      category_id: 'Hardware',
      project_title: 'IoT Environmental Monitor',
      project_description: 'Real-time air quality and climate monitoring device'
    },
    {
      id: 'team-003',
      event_id: eventId,
      name: 'Team Gamma',
      category_id: 'Software',
      project_title: 'Blockchain Supply Chain Tracker',
      project_description: 'Decentralized supply chain management platform'
    },
    {
      id: 'team-004',
      event_id: eventId,
      name: 'Team Delta',
      category_id: 'Hardware',
      project_title: 'Smart Agriculture Robot',
      project_description: 'Autonomous farming assistant with precision planting'
    },
    {
      id: 'team-005',
      event_id: eventId,
      name: 'Team Epsilon',
      category_id: 'Software',
      project_title: 'Educational VR Platform',
      project_description: 'Immersive virtual reality learning environment'
    },
    {
      id: 'team-006',
      event_id: eventId,
      name: 'Team Zeta',
      category_id: 'Hardware',
      project_title: 'Wearable Health Monitor',
      project_description: 'Continuous vital signs tracking device'
    }
  ];

  const judges = [
    {
      id: 'judge-001',
      event_id: eventId,
      name: 'Dr. Sarah Chen',
      email: 'sarah.chen@example.com',
      category: 'Software',
      token: 'token-sarah-001'
    },
    {
      id: 'judge-002',
      event_id: eventId,
      name: 'Prof. Michael Torres',
      email: 'michael.torres@example.com',
      category: 'Hardware',
      token: 'token-michael-002'
    },
    {
      id: 'judge-003',
      event_id: eventId,
      name: 'Dr. Emily Watson',
      email: 'emily.watson@example.com',
      category: 'Software',
      token: 'token-emily-003'
    }
  ];

  const round1 = {
    id: 'round-001',
    event_id: eventId,
    name: 'Round 1 - Initial Screening',
    round_number: 1,
    status: 'active',
    max_criteria: 5,
    selection_mode: 'PER_JUDGE_TOP_N',
    selection_params: { top_n: 2 },
    normalization_method: 'Z_SCORE',
    is_computed: false
  };

  const round1Criteria = [
    {
      id: 'criteria-001',
      round_id: round1.id,
      name: 'Innovation',
      description: 'Originality and novelty of the solution',
      max_marks: 20,
      weight: 1.5,
      display_order: 0
    },
    {
      id: 'criteria-002',
      round_id: round1.id,
      name: 'Technical Implementation',
      description: 'Quality of code/hardware and technical execution',
      max_marks: 20,
      weight: 1.5,
      display_order: 1
    },
    {
      id: 'criteria-003',
      round_id: round1.id,
      name: 'Impact',
      description: 'Potential real-world impact and scalability',
      max_marks: 20,
      weight: 1.0,
      display_order: 2
    },
    {
      id: 'criteria-004',
      round_id: round1.id,
      name: 'Presentation',
      description: 'Clarity and effectiveness of demonstration',
      max_marks: 20,
      weight: 1.0,
      display_order: 3
    },
    {
      id: 'criteria-005',
      round_id: round1.id,
      name: 'Team Collaboration',
      description: 'Evidence of effective teamwork',
      max_marks: 20,
      weight: 0.5,
      display_order: 4
    }
  ];

  const round1JudgeAssignments = [
    {
      id: 'assignment-001',
      round_id: round1.id,
      judge_id: judges[0].id,
      judge_type: 'SOFTWARE',
      judge_weight: 1.0
    },
    {
      id: 'assignment-002',
      round_id: round1.id,
      judge_id: judges[1].id,
      judge_type: 'HARDWARE',
      judge_weight: 1.0
    },
    {
      id: 'assignment-003',
      round_id: round1.id,
      judge_id: judges[2].id,
      judge_type: 'BOTH',
      judge_weight: 1.0
    }
  ];

  const round1Evaluations = [
    {
      judge_id: judges[0].id,
      team_id: teams[0].id,
      scores: { 'criteria-001': 18, 'criteria-002': 19, 'criteria-003': 17, 'criteria-004': 18, 'criteria-005': 19 }
    },
    {
      judge_id: judges[0].id,
      team_id: teams[2].id,
      scores: { 'criteria-001': 16, 'criteria-002': 17, 'criteria-003': 15, 'criteria-004': 16, 'criteria-005': 17 }
    },
    {
      judge_id: judges[0].id,
      team_id: teams[4].id,
      scores: { 'criteria-001': 15, 'criteria-002': 16, 'criteria-003': 14, 'criteria-004': 15, 'criteria-005': 16 }
    },
    {
      judge_id: judges[1].id,
      team_id: teams[1].id,
      scores: { 'criteria-001': 17, 'criteria-002': 18, 'criteria-003': 16, 'criteria-004': 17, 'criteria-005': 18 }
    },
    {
      judge_id: judges[1].id,
      team_id: teams[3].id,
      scores: { 'criteria-001': 19, 'criteria-002': 19, 'criteria-003': 18, 'criteria-004': 19, 'criteria-005': 19 }
    },
    {
      judge_id: judges[1].id,
      team_id: teams[5].id,
      scores: { 'criteria-001': 14, 'criteria-002': 15, 'criteria-003': 13, 'criteria-004': 14, 'criteria-005': 15 }
    },
    {
      judge_id: judges[2].id,
      team_id: teams[0].id,
      scores: { 'criteria-001': 17, 'criteria-002': 18, 'criteria-003': 16, 'criteria-004': 17, 'criteria-005': 18 }
    },
    {
      judge_id: judges[2].id,
      team_id: teams[1].id,
      scores: { 'criteria-001': 16, 'criteria-002': 17, 'criteria-003': 15, 'criteria-004': 16, 'criteria-005': 17 }
    },
    {
      judge_id: judges[2].id,
      team_id: teams[2].id,
      scores: { 'criteria-001': 18, 'criteria-002': 18, 'criteria-003': 17, 'criteria-004': 18, 'criteria-005': 18 }
    },
    {
      judge_id: judges[2].id,
      team_id: teams[3].id,
      scores: { 'criteria-001': 18, 'criteria-002': 19, 'criteria-003': 17, 'criteria-004': 18, 'criteria-005': 19 }
    },
    {
      judge_id: judges[2].id,
      team_id: teams[4].id,
      scores: { 'criteria-001': 15, 'criteria-002': 16, 'criteria-003': 14, 'criteria-004': 15, 'criteria-005': 16 }
    },
    {
      judge_id: judges[2].id,
      team_id: teams[5].id,
      scores: { 'criteria-001': 14, 'criteria-002': 15, 'criteria-003': 13, 'criteria-004': 14, 'criteria-005': 15 }
    }
  ];

  return {
    event,
    teams,
    judges,
    rounds: [round1],
    criteria: round1Criteria,
    judgeAssignments: round1JudgeAssignments,
    evaluations: round1Evaluations
  };
}

export async function loadExampleDataset(supabase) {
  const dataset = generateExampleDataset();

  console.log('Loading example dataset...');

  try {
    const { data: existingEvent } = await supabase
      .from('events')
      .select('id')
      .eq('id', dataset.event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log('Example event already exists. Skipping...');
      return { success: true, message: 'Dataset already exists' };
    }

    const { error: eventError } = await supabase
      .from('events')
      .insert(dataset.event);

    if (eventError) throw eventError;
    console.log('✓ Event created');

    const { error: teamsError } = await supabase
      .from('teams')
      .insert(dataset.teams);

    if (teamsError) throw teamsError;
    console.log('✓ Teams created');

    const { error: judgesError } = await supabase
      .from('judges')
      .insert(dataset.judges);

    if (judgesError) throw judgesError;
    console.log('✓ Judges created');

    const { error: roundsError } = await supabase
      .from('rounds')
      .insert(dataset.rounds);

    if (roundsError) throw roundsError;
    console.log('✓ Round created');

    const { error: criteriaError } = await supabase
      .from('round_criteria')
      .insert(dataset.criteria);

    if (criteriaError) throw criteriaError;
    console.log('✓ Criteria created');

    const { error: assignmentsError } = await supabase
      .from('round_judge_assignments')
      .insert(dataset.judgeAssignments);

    if (assignmentsError) throw assignmentsError;
    console.log('✓ Judge assignments created');

    const evaluationsToInsert = dataset.evaluations.map(evaluation => ({
      round_id: dataset.rounds[0].id,
      judge_id: evaluation.judge_id,
      team_id: evaluation.team_id,
      scores: evaluation.scores,
      is_draft: false,
      submitted_at: new Date().toISOString(),
      version: 1
    }));

    const { error: evaluationsError } = await supabase
      .from('round_evaluations')
      .insert(evaluationsToInsert);

    if (evaluationsError) throw evaluationsError;
    console.log('✓ Evaluations created');

    console.log('✓ Example dataset loaded successfully!');

    return {
      success: true,
      message: 'Dataset loaded successfully',
      data: {
        event_id: dataset.event.id,
        round_id: dataset.rounds[0].id,
        teams_count: dataset.teams.length,
        judges_count: dataset.judges.length,
        evaluations_count: dataset.evaluations.length
      }
    };

  } catch (error) {
    console.error('Error loading example dataset:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
