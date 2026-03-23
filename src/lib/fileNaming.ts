/**
 * Build a standardized download filename: firstname.lastname_doctype_companyname.ext
 * Example: "john.smith_ats-resume_acme-corp.docx"
 */
export function buildFileName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  docType: string,
  companyName: string | null | undefined,
  extension: string
): string {
  const name = [firstName, lastName].filter(Boolean).join(".").toLowerCase() || "document";
  const doc = docType.replace(/\s+/g, "-").toLowerCase();
  const company = (companyName || "company").replace(/\s+/g, "-").toLowerCase();
  return `${name}_${doc}_${company}.${extension}`;
}
