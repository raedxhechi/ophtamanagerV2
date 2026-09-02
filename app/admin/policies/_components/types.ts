export type MedicineItem = {
  id: string;
  name: string;
  medicine_type: string;
  background_color: string | null;
  text_color: string | null;
};

export type CompanyItem = {
  id: string;
  name: string;
  insurance_type: string;
  iknumber: string | null;
};

export type OfficeOption = { id: string; name: string | null };

/**
 * An existing policy as the "copy from" picker needs it: what to call it, and
 * the two sets it holds. The ids travel with the list rather than being fetched
 * on pick — they are two arrays of uuids, and having them already there is what
 * makes duplicating fill the form instantly.
 */
export type PolicySummary = {
  id: string;
  /** "Praxis Dr. Meier — Policy 2", as the list numbers them. */
  label: string;
  officeId: string | null;
  officeName: string;
  medicineIds: string[];
  companyIds: string[];
};
