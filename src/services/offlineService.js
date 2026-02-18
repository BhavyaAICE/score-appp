import { supabase } from '../supabaseClient';

const STORAGE_KEY = 'judge_offline_evaluations';

export const offlineService = {
    /**
     * Check if device is online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Save evaluation to local storage
     */
    saveOfflineEvaluation(evaluation) {
        try {
            const stored = this.getStoredEvaluations();
            // Create a unique key for the evaluation (team + round + judge)
            const key = `${evaluation.round_id}_${evaluation.judge_id}_${evaluation.team_id}`;

            stored[key] = {
                ...evaluation,
                offline_timestamp: new Date().toISOString(),
                synced: false
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            return { success: true };
        } catch (error) {
            console.error('Error saving offline:', error);
            return { success: false, error: 'Storage full or disabled' };
        }
    },

    /**
     * Get all stored offline evaluations
     */
    getStoredEvaluations() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            return {};
        }
    },

    /**
     * Get specific evaluation from local storage
     */
    getOfflineEvaluation(roundId, judgeId, teamId) {
        const stored = this.getStoredEvaluations();
        const key = `${roundId}_${judgeId}_${teamId}`;
        return stored[key] || null;
    },

    /**
     * Sync pending evaluations to server
     */
    async syncPendingEvaluations() {
        if (!this.isOnline()) return { success: false, message: 'Still offline' };

        const stored = this.getStoredEvaluations();
        const keys = Object.keys(stored);
        let syncedCount = 0;
        let errors = [];

        for (const key of keys) {
            const evaluation = stored[key];
            if (evaluation.synced) continue;

            // Prepare payload (remove offline-specific fields)
            const { offline_timestamp, synced, id, ...payload } = evaluation;

            // If it has an ID, it was an update to an existing record, otherwise insert
            let result;
            if (id) {
                result = await supabase
                    .from('round_evaluations')
                    .update(payload)
                    .eq('id', id);
            } else {
                result = await supabase
                    .from('round_evaluations')
                    .insert(payload);
            }

            if (!result.error) {
                // Mark as synced or remove from local storage
                // We remove it to keep storage clean, as the source of truth is now the server
                delete stored[key];
                syncedCount++;
            } else {
                console.error(`Failed to sync ${key}:`, result.error);
                errors.push({ key, error: result.error.message });
            }
        }

        // Update local storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

        return {
            success: errors.length === 0,
            syncedCount,
            errors
        };
    },

    /**
     * Clear offline storage (useful for logout)
     */
    clearOfflineData() {
        localStorage.removeItem(STORAGE_KEY);
    }
};
