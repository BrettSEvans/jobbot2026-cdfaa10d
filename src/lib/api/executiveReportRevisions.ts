/**
 * Executive report revision CRUD — delegates to generic factory.
 */
import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('executive_report_revisions', 'html');

export const saveExecutiveReportRevision = crud.save;
export const getExecutiveReportRevisions = crud.getAll;
export const deleteExecutiveReportRevision = crud.remove;
