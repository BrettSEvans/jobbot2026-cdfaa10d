/**
 * Dashboard revision CRUD — delegates to generic factory.
 */
import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('dashboard_revisions', 'dashboard_html');

export const saveDashboardRevision = crud.save;
export const getDashboardRevisions = crud.getAll;
export const deleteDashboardRevision = crud.remove;
