import { db, type GenericRecord, type OutboxMutation, type ConflictLogItem, type GPSCoords } from '../db/schema';
import { runDomainAgnosticTriage } from './aiTriageEngine';
import { getSchemaById } from './schemaStore';

export interface QueueMutationParams {
  record_id: string;
  schema_id: string;
  parent_rev: string;
  worker_id: string;
  worker_role: string;
  device_id: string;
  gps_coords: GPSCoords;
  data: Record<string, any>;
}

/**
 * Queues a frontline data mutation into IndexedDB outbox queue
 */
export async function queueRecordMutation(params: QueueMutationParams): Promise<number> {
  const timestamp = new Date().toISOString();

  const mutation: OutboxMutation = {
    record_id: params.record_id,
    schema_id: params.schema_id,
    parent_rev: params.parent_rev,
    worker_id: params.worker_id,
    worker_role: params.worker_role,
    device_id: params.device_id,
    timestamp,
    gps_coords: params.gps_coords,
    data: {
      ...params.data,
      updated_at: timestamp
    },
    synced: false
  };

  const id = await db.outbox.add(mutation);

  // Check if a local collision exists in outbox
  await checkForLocalCollisions(params.record_id);

  return id;
}

/**
 * Checks if multiple divergent outbox mutations exist for the same record
 */
export async function checkForLocalCollisions(recordId: string): Promise<ConflictLogItem | null> {
  const outboxItems = await db.outbox.where({ record_id: recordId }).toArray();
  const unSynced = outboxItems.filter((item) => !item.synced);

  if (unSynced.length >= 2) {
    const mutA = unSynced[0];
    const mutB = unSynced[1];

    const schemaId = mutA.schema_id || 'rural_health';
    const schema = await getSchemaById(schemaId);

    // Run semantic triage
    const aiTriage = await runDomainAgnosticTriage(
      recordId,
      mutA.parent_rev,
      {
        worker_id: mutA.worker_id,
        worker_role: mutA.worker_role,
        device_id: mutA.device_id,
        timestamp: mutA.timestamp,
        gps_coords: mutA.gps_coords,
        data: mutA.data
      },
      {
        worker_id: mutB.worker_id,
        worker_role: mutB.worker_role,
        device_id: mutB.device_id,
        timestamp: mutB.timestamp,
        gps_coords: mutB.gps_coords,
        data: mutB.data
      },
      schema
    );

    const conflictId = `CONF-${Date.now().toString(36).toUpperCase()}-${recordId.replace(/[^a-zA-Z0-9]/g, '')}`;

    const conflictItem: ConflictLogItem = {
      conflict_id: conflictId,
      record_id: recordId,
      schema_id: schemaId,
      base_rev: mutA.parent_rev,
      active_branch: {
        rev: mutA.parent_rev,
        worker_id: mutA.worker_id,
        worker_role: mutA.worker_role,
        device_id: mutA.device_id,
        timestamp: mutA.timestamp,
        gps_coords: mutA.gps_coords,
        data: mutA.data
      },
      incoming_branch: {
        worker_id: mutB.worker_id,
        worker_role: mutB.worker_role,
        device_id: mutB.device_id,
        timestamp: mutB.timestamp,
        gps_coords: mutB.gps_coords,
        data: mutB.data
      },
      ai_triage: aiTriage,
      status: 'PENDING_REVIEW',
      created_at: new Date().toISOString()
    };

    // Update or insert into conflicts table
    const existing = await db.conflicts.where({ record_id: recordId, status: 'PENDING_REVIEW' }).first();
    if (existing) {
      await db.conflicts.put({
        ...existing,
        ai_triage: aiTriage,
        incoming_branch: conflictItem.incoming_branch
      });
      return existing;
    } else {
      await db.conflicts.add(conflictItem);
      // Update record sync status to conflict
      const rec = await db.records.get(recordId);
      if (rec) {
        await db.records.update(recordId, { sync_status: 'conflict' });
      }
      return conflictItem;
    }
  }

  return null;
}

/**
 * Resolves a conflict and commits the final unified record state
 */
export async function resolveConflict(
  conflictId: string,
  decision: 'BRANCH_A' | 'BRANCH_B' | 'MERGE' | 'MANUAL',
  customData?: Record<string, any>,
  baseStationUrl: string = 'http://localhost:8000'
): Promise<{ new_rev: string; record: GenericRecord }> {
  const conflict = await db.conflicts.get(conflictId);
  if (!conflict) {
    throw new Error(`Conflict ${conflictId} not found`);
  }

  let finalPayload: Record<string, any> = {};

  if (decision === 'BRANCH_A') {
    finalPayload = { ...conflict.active_branch.data };
  } else if (decision === 'BRANCH_B') {
    finalPayload = { ...conflict.incoming_branch.data };
  } else if (decision === 'MERGE') {
    finalPayload = conflict.ai_triage?.resolved_data || {
      ...conflict.active_branch.data,
      ...conflict.incoming_branch.data
    };
  } else {
    // MANUAL
    finalPayload = customData || { ...conflict.active_branch.data };
  }

  const newRev = `2-mrg${Date.now().toString(36).slice(-4)}`;
  const timestamp = new Date().toISOString();

  // Try pushing resolution to base station backend if reachable
  try {
    await fetch(`${baseStationUrl}/api/v1/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        final_data: finalPayload,
        resolution_strategy: decision
      })
    });
  } catch (e) {
    console.warn('Base station server resolution fallback to local commit:', e);
  }

  // Update local record in Dexie
  const existingRecord = await db.records.get(conflict.record_id);
  const updatedRecord: GenericRecord = {
    id: conflict.record_id,
    schema_id: conflict.schema_id,
    rev: newRev,
    data: finalPayload,
    sync_status: 'synced',
    created_at: existingRecord?.created_at || timestamp,
    updated_at: timestamp,
    metadata: {
      created_by_worker_id: existingRecord?.metadata?.created_by_worker_id || conflict.active_branch.worker_id,
      created_by_worker_role: existingRecord?.metadata?.created_by_worker_role || conflict.active_branch.worker_role,
      device_id: existingRecord?.metadata?.device_id || 'LOCAL-SYNC',
      gps_coords: conflict.active_branch.gps_coords,
      created_at: existingRecord?.metadata?.created_at || timestamp,
      last_updated_at: timestamp,
      last_updated_by_role: `Supervisor (${decision})`
    }
  };

  await db.records.put(updatedRecord);

  // Clear outbox mutations for this record
  await db.outbox.where({ record_id: conflict.record_id }).delete();

  // Mark conflict as RESOLVED
  await db.conflicts.update(conflictId, {
    status: 'RESOLVED',
    resolved_at: timestamp,
    resolved_by: `Supervisor (${decision})`,
    resolution_decision: decision
  });

  return { new_rev: newRev, record: updatedRecord };
}
