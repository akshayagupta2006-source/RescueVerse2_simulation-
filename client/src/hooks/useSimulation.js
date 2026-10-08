/**
 * useSimulation.js
 * Custom hook that manages simulation state, result saving, and retry logic.
 * Keeps SimulationPage clean and reusable.
 */
import { useState, useCallback, useRef } from 'react';
import { saveResult } from '../services/results';

export function useSimulation(user, setUser) {
  const [simResult,   setSimResult]   = useState(null);   // raw result from Phaser
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saved,       setSaved]       = useState(false);
  const [startedAt,   setStartedAt]   = useState(null);
  const saveAttempted = useRef(false);

  /** Called when GameEngine emits simulationEnd */
  const handleEnd = useCallback(async (rawResult) => {
    setSimResult(rawResult);
    if (saveAttempted.current) return;
    saveAttempted.current = true;

    setSaving(true);
    setSaveError('');

    try {
      const payload = {
        scenarioId:       rawResult.scenarioId,
        scenarioType:     rawResult.scenarioType,
        score:            rawResult.score,
        survivorsHelped:  rawResult.survivorsHelped  || 0,
        survivorsPanicked:rawResult.survivorsPanicked|| 0,
        survivorsLost:    rawResult.survivorsLost    || 0,
        evacuated:        rawResult.evacuated        || false,
        healthRemaining:  rawResult.healthRemaining  || 0,
        debrisHits:       rawResult.debrisHits       || 0,
        decisions:        rawResult.decisions        || [],
        durationSeconds:  rawResult.durationSeconds  || 0,
      };

      await saveResult(payload);
      setSaved(true);

      // Optimistically update global user score in AuthContext
      if (setUser && user) {
        setUser(u => ({
          ...u,
          totalScore:       (u.totalScore || 0) + rawResult.score,
          totalSimulations: (u.totalSimulations || 0) + 1,
        }));
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save — check your connection.');
    } finally {
      setSaving(false);
    }
  }, [user, setUser]);

  const startSimulation = useCallback(() => {
    setSimResult(null);
    setSaved(false);
    setSaveError('');
    saveAttempted.current = false;
    setStartedAt(Date.now());
  }, []);

  const grade = simResult ? calcGrade(simResult.score) : null;
  const passed = simResult
    ? simResult.score >= 450 && simResult.evacuated
    : false;

  return {
    simResult,
    saving,
    saveError,
    saved,
    startedAt,
    grade,
    passed,
    handleEnd,
    startSimulation,
  };
}

export function calcGrade(score) {
  if (score >= 900) return 'S';
  if (score >= 750) return 'A';
  if (score >= 600) return 'B';
  if (score >= 450) return 'C';
  if (score >= 300) return 'D';
  return 'F';
}

/** Returns a plain-English advisory based on the decision log */
export function generateAdvisory(decisions = []) {
  if (!decisions.length) return [];

  const tips = [];
  const counts = {};
  decisions.forEach(d => { counts[d.action] = (counts[d.action] || 0) + 1; });

  if ((counts['hit_by_debris'] || 0) > 1) {
    tips.push({ type: 'danger', text: `You were hit by debris ${counts['hit_by_debris']} times. Always move to a desk and press SPACE during shaking phases.` });
  }
  if ((counts['ignored_npc'] || 0) > 0) {
    tips.push({ type: 'warning', text: `${counts['ignored_npc']} injured civilian(s) were left without assistance. Approach injured NPCs and press E to stabilise them.` });
  }
  if ((counts['took_cover'] || 0) === 0) {
    tips.push({ type: 'danger', text: 'You never took cover during the earthquake. Find a desk and press SPACE — it dramatically reduces debris damage.' });
  }
  if ((counts['outside_shaking'] || 0) > 3) {
    tips.push({ type: 'warning', text: `You stood exposed during shaking for ${counts['outside_shaking']} seconds. This drained your score steadily.` });
  }
  if (!counts['evacuated']) {
    tips.push({ type: 'danger', text: 'You did not reach the evacuation exit. During the evacuation phase, navigate to the green EXIT zone in the bottom-right corner.' });
  }
  if ((counts['helped_npc'] || 0) + (counts['calmed_npc'] || 0) >= 4) {
    tips.push({ type: 'success', text: 'Excellent civilian support — you assisted multiple people under pressure.' });
  }

  return tips;
}
