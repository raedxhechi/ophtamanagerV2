import type { Database } from "@/types/supabase";

/**
 * Proof-of-concept XML export for one suborder, modelled on the sample the
 * client sent.
 *
 * Two things about it are guesses, deliberately and visibly:
 *
 * - **The element names.** The sample arrived as flattened text with the tags
 *   stripped, so nothing here is the real interface's vocabulary. The *shape*
 *   is faithful to the sample — order header, one position per injection, then
 *   the referenced master data and the code lists it resolves against, then the
 *   envelope's trailer — because that much survived the flattening. The names
 *   are ours until the XSD arrives.
 * - **The values this app has nowhere to read from.** Every one of those is
 *   written out as a bracketed placeholder (see {@link MISSING}) rather than
 *   left empty or invented, so the file doubles as the list of what the client
 *   still owes us: an article code, a substance code, a dose with its unit, and
 *   a station code are all master data of the *receiving* system, and the
 *   `medicine` table holds a name, a type and two colours.
 *
 * The dates are the one documented liberty: `application_date`, `delivery_date`
 * and `date_of_birth` are `date` columns with no time of day, and the interface
 * wants a datetime, so they are exported at midnight. The database keeps its
 * date. For the pharmacy the time is the point of those two fields — 09:00
 * ready-by against a 10:00 administration — so midnight is a placeholder as
 * much as anything in brackets.
 */

type SuborderRow = Database["public"]["Tables"]["suborders"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type MedicineRow = Database["public"]["Tables"]["medicine"]["Row"];
type InsuranceRow = Database["public"]["Tables"]["insurance_companies"]["Row"];
type OfficeRow = Database["public"]["Tables"]["doctor_office"]["Row"];
type UserDataRow = Database["public"]["Tables"]["user_data"]["Row"];
type Gender = Database["public"]["Enums"]["gender"];

/**
 * The suborder with everything the export reads: its patient (+ that patient's
 * insurance company) and its parent order (+ medicine, office, and the office's
 * default doctor, who is the prescriber the same way the prescription PDF reads
 * them). Matches the select in the route handler.
 */
export type SuborderForXml = SuborderRow & {
  patient: (PatientRow & { insurance_companies: InsuranceRow | null }) | null;
  order:
    | (OrderRow & {
        medicine: MedicineRow | null;
        doctor_office:
          | (OfficeRow & { default_doctor: UserDataRow | null })
          | null;
      })
    | null;
};

/**
 * What the sample carries and this app does not hold. Each one is emitted in
 * square brackets, named after the field it stands in for, so a reviewer can
 * read the gaps straight out of the file.
 */
const MISSING = {
  article: "[Article-code]",
  substance: "[Substance-code]",
  substanceName: "[Substance-name]",
  dose: "[Dose]",
  doseUnit: "[Dose-unit]",
  station: "[Station-code]",
  ward: "[Ward-name]",
  externalOrderNo: "[External-order-number]",
  gender: "[Gender]",
  doctorGender: "[Doctor-gender]",
  doctorType: "[Doctor-type]",
  insuranceStatus: "[Insurance-status]",
  insuredType: "[Insured-type]",
  insuranceNo: "[Insurance-number]",
  interfaceVersion: "[Interface-version]",
  trailer: "[Trailer-value]",
} as const;

/**
 * Constants of this app's domain rather than data it is missing: every order it
 * places is an IVOM preparation, dosed absolutely, and an exported order is by
 * definition newly requested — `10 Angefordert` in the sample's own status
 * list. The rest of that list is unknown, so `orders.status` is not mapped onto
 * it: a processing or delivered order still exports as requested, which is
 * honest for a one-way import feed and wrong the moment the interface grows a
 * second direction.
 */
const PREPARATION_TYPE = "IVOM";
const DOSE_TYPE = "ABS";
const POSITION_STATUS = "10";
const COUNTRY = "DE";

const GENDER_CODES: Record<Gender, string> = {
  male: "m",
  female: "w",
  other: "n",
};

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** A value, or the bracketed placeholder naming what should have been there. */
const or = (value: string | null | undefined, placeholder: string) => {
  const trimmed = value?.trim();
  return esc(trimmed ? trimmed : placeholder);
};

/** A `date` column at midnight — see the note on dates at the top of the file. */
const atMidnight = (value: string | null | undefined, placeholder: string) =>
  value ? `${value.slice(0, 10)}T00:00:00` : placeholder;

/**
 * A timestamp column, to the second and without a zone — in the clinic's own
 * calendar rather than the server's, the same way the dashboard's ranges are
 * (see app/admin/(dashboard)/components/ranges.ts). The sample writes its order
 * and application times bare, with no offset, so they are local times; a host
 * running in UTC would stamp a German afternoon order an hour or two early.
 */
const TIME_ZONE = "Europe/Berlin";

const dateTime = (value: string | null | undefined, placeholder: string) => {
  if (!value) return placeholder;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return placeholder;
  // en-CA gives yyyy-mm-dd, and h23 keeps midnight at 00 rather than 24.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
};

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/**
 * One position per eye, the way the sample reads: a position carries a single
 * dose and a single site, so a suborder for both eyes is two positions with two
 * doses — which is also what `orders.quantity` already counts.
 */
const eyeCodes = (suborder: SuborderForXml) => {
  const eyes: string[] = [];
  if (suborder.right_eye) eyes.push("AR");
  if (suborder.left_eye) eyes.push("AL");
  return eyes.length ? eyes : ["[Eye-code]"];
};

/** The filename the download is offered under. */
export const suborderXmlFilename = (suborder: SuborderForXml) =>
  `ivom-order-${suborder.id}.xml`;

export function buildSuborderXml(suborder: SuborderForXml): string {
  const order = suborder.order;
  const patient = suborder.patient;
  const insurance = patient?.insurance_companies ?? null;
  const office = order?.doctor_office ?? null;
  const doctor = office?.default_doctor ?? null;
  const medicine = order?.medicine ?? null;

  // Ids are our own UUIDs throughout, including the order number — the `orders`
  // table has no running number of its own, and these interfaces key duplicate
  // detection on it, so a real export needs a sequence (and probably a shorter
  // field than 36 characters).
  const orderNo = order?.id ?? suborder.order_id;
  const patientId = patient?.id ?? "[Patient-id]";
  const insuranceId = insurance?.id ?? "[Insurance-id]";
  const doctorId = doctor?.id ?? "[Doctor-id]";

  const positions = eyeCodes(suborder)
    .map((eye, index) =>
      [
        `        <Position>`,
        `          <PositionId>${esc(`${orderNo}-${index + 1}`)}</PositionId>`,
        `          <PositionNo>${index + 1}</PositionNo>`,
        `          <StatusRef>${POSITION_STATUS}</StatusRef>`,
        `          <SubstanceRef>${esc(MISSING.substance)}</SubstanceRef>`,
        `          <DoseType>${DOSE_TYPE}</DoseType>`,
        `          <DoseOrdered>${esc(MISSING.dose)}</DoseOrdered>`,
        `          <DosePrepared>${esc(MISSING.dose)}</DosePrepared>`,
        `          <DoseUnitRef>${esc(MISSING.doseUnit)}</DoseUnitRef>`,
        `          <ArticleRef>${esc(MISSING.article)}</ArticleRef>`,
        `          <ApplicationDateTime>${atMidnight(order?.application_date, "[Application-date]")}</ApplicationDateTime>`,
        `          <DeliveryDateTime>${atMidnight(order?.delivery_date, "[Delivery-date]")}</DeliveryDateTime>`,
        `          <Site>${esc(eye)}</Site>`,
        `        </Position>`,
      ].join("\n")
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Proof of concept. Element names are placeholders until the interface's XSD is
  available, and every value in [square brackets] is data this app does not
  hold. Dates with no time of day are exported at midnight.
-->
<OrderImport>
  <Header>
    <MessageType>OrderImport</MessageType>
    <InterfaceVersion>${esc(MISSING.interfaceVersion)}</InterfaceVersion>
    <MessageId>${esc(crypto.randomUUID())}</MessageId>
    <CreatedAt>${dateTime(new Date().toISOString(), "")}</CreatedAt>
    <Sender>Ophtamanager</Sender>
  </Header>
  <Orders>
    <Order>
      <OrderNo>${esc(orderNo)}</OrderNo>
      <OrderDateTime>${dateTime(order?.created_at, "[Order-date]")}</OrderDateTime>
      <ExternalOrderNo>${esc(MISSING.externalOrderNo)}</ExternalOrderNo>
      <PatientRef>${esc(patientId)}</PatientRef>
      <PhysicianRef>${esc(doctorId)}</PhysicianRef>
      <StationRef>${esc(MISSING.station)}</StationRef>
      <Gender>${patient?.gender ? GENDER_CODES[patient.gender] : esc(MISSING.gender)}</Gender>
      <DateOfBirth>${atMidnight(patient?.date_of_birth, "[Date-of-birth]")}</DateOfBirth>
      <InsuranceStatus>${or(patient?.status, MISSING.insuranceStatus)}</InsuranceStatus>
      <PreparationType>${PREPARATION_TYPE}</PreparationType>
      <Positions>
${positions}
      </Positions>
    </Order>
  </Orders>
  <MasterData>
    <Articles>
      <Article>
        <Code>${esc(MISSING.article)}</Code>
        <PreparationType>${PREPARATION_TYPE}</PreparationType>
        <Name>${or(medicine?.name, "[Article-name]")}</Name>
      </Article>
    </Articles>
    <Substances>
      <Substance>
        <Code>${esc(MISSING.substance)}</Code>
        <Name>${esc(MISSING.substanceName)}</Name>
      </Substance>
    </Substances>
    <Patients>
      <Patient>
        <Id>${esc(patientId)}</Id>
        <LastName>${or(patient?.last_name, "[Last-name]")}</LastName>
        <FirstName>${or(patient?.first_name, "[First-name]")}</FirstName>
        <Gender>${patient?.gender ? GENDER_CODES[patient.gender] : esc(MISSING.gender)}</Gender>
        <DateOfBirth>${atMidnight(patient?.date_of_birth, "[Date-of-birth]")}</DateOfBirth>
        <Street>${or(joinParts(patient?.street, patient?.house_number), "[Street]")}</Street>
        <ZipCode>${or(patient?.zipcode, "[Zip-code]")}</ZipCode>
        <City>${or(patient?.city, "[City]")}</City>
        <Country>${COUNTRY}</Country>
      </Patient>
    </Patients>
    <PatientInsurances>
      <PatientInsurance>
        <PatientRef>${esc(patientId)}</PatientRef>
        <InsuranceRef>${esc(insuranceId)}</InsuranceRef>
        <StatusRef>${or(patient?.status, MISSING.insuranceStatus)}</StatusRef>
        <InsuredType>${esc(MISSING.insuredType)}</InsuredType>
        <InsuranceNo>${or(patient?.insurance_number, MISSING.insuranceNo)}</InsuranceNo>
      </PatientInsurance>
    </PatientInsurances>
    <Insurances>
      <Insurance>
        <Id>${esc(insuranceId)}</Id>
        <Name>${or(insurance?.name, "[Insurance-name]")}</Name>
        <ShortName>${or(insurance?.name, "[Insurance-name]")}</ShortName>
        <IkNumber>${or(insurance?.iknumber, "[IK-number]")}</IkNumber>
        <Private>${insurance?.insurance_type === "Privat" ? "j" : "n"}</Private>
      </Insurance>
    </Insurances>
    <Physicians>
      <Physician>
        <Id>${esc(doctorId)}</Id>
        <LastName>${or(doctor?.last_name, "[Doctor-last-name]")}</LastName>
        <FirstName>${or(doctor?.first_name, "[Doctor-first-name]")}</FirstName>
        <Gender>${esc(MISSING.doctorGender)}</Gender>
        <Type>${esc(MISSING.doctorType)}</Type>
        <DoctorNo>${or(doctor?.doctor_number, "[Doctor-number]")}</DoctorNo>
        <Bsnr>${or(office?.bsnr, "[BSNR]")}</Bsnr>
      </Physician>
    </Physicians>
    <Stations>
      <Station>
        <Code>${esc(MISSING.station)}</Code>
        <Institution>${or(office?.name, "[Office-name]")}</Institution>
        <Ward>${esc(MISSING.ward)}</Ward>
      </Station>
    </Stations>
    <!--
      The code lists are the receiving system's own, taken from the sample. They
      are repeated here because the sample repeats them; a real export sends the
      entries its orders actually reference.
    -->
    <CodeLists>
      <OrderStatuses>
        <Entry code="10">Angefordert</Entry>
      </OrderStatuses>
      <PreparationTypes>
        <Entry code="IVOM">IVOM-Zubereitung</Entry>
      </PreparationTypes>
      <DoseTypes>
        <Entry code="ABS">Absolute Dosis</Entry>
      </DoseTypes>
      <Units>
        <Entry code="1">mg</Entry>
        <Entry code="10">ml</Entry>
        <Entry code="0">---</Entry>
      </Units>
      <Genders>
        <Entry code="w">weiblich</Entry>
        <Entry code="m">maennlich</Entry>
        <Entry code="n">neutral</Entry>
      </Genders>
      <Sites>
        <Entry code="AR">Auge Rechts</Entry>
        <Entry code="AL">Auge Links</Entry>
      </Sites>
    </CodeLists>
  </MasterData>
  <!--
    The sample's trailer is five unexplained numbers (0 1 9042901 1 7372801) —
    record counts and internal ids, most likely, but not something to guess at.
  -->
  <Trailer>
    <Value>${esc(MISSING.trailer)}</Value>
  </Trailer>
</OrderImport>
`;
}
