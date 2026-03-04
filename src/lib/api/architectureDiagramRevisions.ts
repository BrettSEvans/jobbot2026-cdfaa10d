/**
 * Architecture diagram revision CRUD — delegates to generic factory.
 */
import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('architecture_diagram_revisions', 'html');

export const saveArchitectureDiagramRevision = crud.save;
export const getArchitectureDiagramRevisions = crud.getAll;
export const deleteArchitectureDiagramRevision = crud.remove;
