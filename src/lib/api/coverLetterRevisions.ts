/**
 * Cover letter revision CRUD — delegates to generic factory.
 */
import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('cover_letter_revisions', 'cover_letter');

export const saveCoverLetterRevision = crud.save;
export const getCoverLetterRevisions = crud.getAll;
export const deleteCoverLetterRevision = crud.remove;
