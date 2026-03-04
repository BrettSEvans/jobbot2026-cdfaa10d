import { createRevisionCrud } from './revisionFactory';

const crud = createRevisionCrud('resume_revisions', 'html');

export const saveResumeRevision = crud.save;
export const getResumeRevisions = crud.getAll;
export const deleteResumeRevision = crud.remove;
