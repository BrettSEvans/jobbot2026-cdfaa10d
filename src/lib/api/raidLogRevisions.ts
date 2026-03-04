/**
 * RAID log revision CRUD — delegates to generic factory.
 */
import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('raid_log_revisions', 'html');

export const saveRaidLogRevision = crud.save;
export const getRaidLogRevisions = crud.getAll;
export const deleteRaidLogRevision = crud.remove;
