import {
  applyGeneratedScheduleBatch,
  DraftApplyConflictError
} from "@/lib/schedule/apply-generated-schedule";
import {
  createDraftBatchFromResult,
  getScheduleDraftBatchDetail
} from "@/lib/schedule/draft-batch";
import { runScheduleGeneration } from "@/lib/schedule/generation-engine";
import type { ScheduleGenerationInput } from "@/lib/schedule/generation-types";

export async function generateScheduleDraftWorkflow(input: ScheduleGenerationInput = {}) {
  const result = await runScheduleGeneration(input);
  const batch = await createDraftBatchFromResult({
    result,
    actorUserId: input.actorUserId
  });

  if (input.autoApply) {
    try {
      const applied = await applyGeneratedScheduleBatch({
        batchId: batch.id,
        actorUserId: input.actorUserId
      });

      return {
        batch: await getScheduleDraftBatchDetail(batch.id),
        result,
        applied,
        applyError: null
      };
    } catch (error) {
      if (error instanceof DraftApplyConflictError) {
        return {
          batch: await getScheduleDraftBatchDetail(batch.id),
          result,
          applied: null,
          applyError: {
            error: error.message,
            conflicts: error.conflicts
          }
        };
      }

      throw error;
    }
  }

  return {
    batch: await getScheduleDraftBatchDetail(batch.id),
    result,
    applied: null,
    applyError: null
  };
}
