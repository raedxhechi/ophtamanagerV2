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
