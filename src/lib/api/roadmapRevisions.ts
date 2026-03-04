/**
 * Roadmap revision CRUD — delegates to generic factory.
 */
import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('roadmap_revisions', 'html');

export const saveRoadmapRevision = crud.save;
export const getRoadmapRevisions = crud.getAll;
export const deleteRoadmapRevision = crud.remove;
