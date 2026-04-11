// FHIR R4 resource type to category mapping
// Based on FHIR R4 specification resource list (hl7.org/fhir/resourcelist.html)

const CATEGORY_MAP: Record<string, string> = {
  // Foundation
  CapabilityStatement: 'Foundation',
  StructureDefinition: 'Foundation',
  OperationDefinition: 'Foundation',
  SearchParameter: 'Foundation',
  CompartmentDefinition: 'Foundation',
  CodeSystem: 'Foundation',
  ValueSet: 'Foundation',
  ConceptMap: 'Foundation',
  NamingSystem: 'Foundation',
  Bundle: 'Foundation',
  Binary: 'Foundation',
  Basic: 'Foundation',
  OperationOutcome: 'Foundation',
  Parameters: 'Foundation',
  Subscription: 'Foundation',
  ImplementationGuide: 'Foundation',
  MessageDefinition: 'Foundation',
  StructureMap: 'Foundation',
  GraphDefinition: 'Foundation',
  TerminologyCapabilities: 'Foundation',

  // Individuals
  Patient: 'Individuals',
  Practitioner: 'Individuals',
  PractitionerRole: 'Individuals',
  RelatedPerson: 'Individuals',
  Person: 'Individuals',
  Group: 'Individuals',

  // Entities
  Organization: 'Entities',
  HealthcareService: 'Entities',
  Endpoint: 'Entities',
  Location: 'Entities',
  Substance: 'Entities',
  Device: 'Entities',
  DeviceMetric: 'Entities',
  DeviceDefinition: 'Entities',
  DeviceRequest: 'Entities',
  DeviceUseStatement: 'Entities',
  BiologicallyDerivedProduct: 'Entities',

  // Workflow
  Task: 'Workflow',
  Appointment: 'Workflow',
  AppointmentResponse: 'Workflow',
  Schedule: 'Workflow',
  Slot: 'Workflow',
  Encounter: 'Workflow',
  EpisodeOfCare: 'Workflow',
  Flag: 'Workflow',
  List: 'Workflow',
  ProcessRequest: 'Workflow',
  ProcessResponse: 'Workflow',
  SupplyRequest: 'Workflow',
  SupplyDelivery: 'Workflow',
  EventDefinition: 'Workflow',

  // Clinical
  AllergyIntolerance: 'Clinical',
  Condition: 'Clinical',
  Procedure: 'Clinical',
  FamilyMemberHistory: 'Clinical',
  ClinicalImpression: 'Clinical',
  AdverseEvent: 'Clinical',
  DetectedIssue: 'Clinical',

  // Diagnostics
  Observation: 'Diagnostics',
  DiagnosticReport: 'Diagnostics',
  Specimen: 'Diagnostics',
  BodyStructure: 'Diagnostics',
  ImagingStudy: 'Diagnostics',
  QuestionnaireResponse: 'Diagnostics',
  DocumentReference: 'Diagnostics',
  Questionnaire: 'Diagnostics',
  Media: 'Diagnostics',
  MolecularSequence: 'Diagnostics',
  SpecimenDefinition: 'Diagnostics',

  // Medications
  Medication: 'Medications',
  MedicationRequest: 'Medications',
  MedicationAdministration: 'Medications',
  MedicationDispense: 'Medications',
  MedicationStatement: 'Medications',
  MedicationKnowledge: 'Medications',
  Immunization: 'Medications',
  ImmunizationEvaluation: 'Medications',
  ImmunizationRecommendation: 'Medications',

  // Care Provision
  CarePlan: 'Care Provision',
  CareTeam: 'Care Provision',
  Goal: 'Care Provision',
  ServiceRequest: 'Care Provision',
  NutritionOrder: 'Care Provision',
  VisionPrescription: 'Care Provision',
  RiskAssessment: 'Care Provision',
  RequestGroup: 'Care Provision',
  ActivityDefinition: 'Care Provision',
  PlanDefinition: 'Care Provision',

  // Financial
  Coverage: 'Financial',
  Claim: 'Financial',
  ClaimResponse: 'Financial',
  Account: 'Financial',
  ChargeItem: 'Financial',
  Invoice: 'Financial',
  PaymentNotice: 'Financial',
  ExplanationOfBenefit: 'Financial',
  InsurancePlan: 'Financial',
  PaymentReconciliation: 'Financial',
  ChargeItemDefinition: 'Financial',
  CoverageEligibilityRequest: 'Financial',
  CoverageEligibilityResponse: 'Financial',
  EnrollmentRequest: 'Financial',
  EnrollmentResponse: 'Financial',
  Contract: 'Financial',

  // Security
  Provenance: 'Security',
  AuditEvent: 'Security',
  Consent: 'Security',

  // Documents
  Composition: 'Documents',
  DocumentManifest: 'Documents',

  // Communication
  Communication: 'Communication',
  CommunicationRequest: 'Communication',

  // Research
  ResearchStudy: 'Research',
  ResearchSubject: 'Research',
  ResearchDefinition: 'Research',
  ResearchElementDefinition: 'Research',
  EvidenceVariable: 'Research',
  Evidence: 'Research',

  // Quality & Testing
  Measure: 'Quality',
  MeasureReport: 'Quality',
  TestScript: 'Quality',
  TestReport: 'Quality',
};

/** Display order for FHIR resource categories */
export const CATEGORY_ORDER: string[] = [
  'Individuals',
  'Clinical',
  'Diagnostics',
  'Medications',
  'Care Provision',
  'Workflow',
  'Financial',
  'Foundation',
  'Entities',
  'Security',
  'Documents',
  'Communication',
  'Research',
  'Quality',
  'Other',
];

/** Get the FHIR category for a resource type, or 'Other' for unknown types */
export function getResourceCategory(resourceType: string): string {
  return CATEGORY_MAP[resourceType] ?? 'Other';
}

/** Group items by their category field, preserving insertion order */
export function groupByCategory<T extends { category: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const existing = groups.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.category, [item]);
    }
  }
  return groups;
}
