export const POSITIONS = [
  { value: "TECHNICIAN_MECHANICAL", label: "Service Technician – Mechanical" },
  { value: "TECHNICIAN_ELECTRICAL", label: "Service Technician – Electrical" },
  { value: "TECHNICIAN_ELECTRONIC", label: "Service Technician – Electronic" },
  { value: "TECHNICIAN_REFRIGERATION", label: "Service Technician – Refrigeration" },
  { value: "TECHNICIAN_INDUCTION", label: "Service Technician – Induction Equipment" },
  {
    value: "TECHNICIAN_COMMERCIAL_KITCHEN",
    label: "Service Technician – Complete Commercial Kitchen Equipment",
  },
] as const;

export type PositionValue = (typeof POSITIONS)[number]["value"];

export const ENGAGEMENT_TYPE_OPTIONS = [
  {
    value: "COMMISSION",
    label: "Associate Service Partner",
    helper: "Paid per job/visit — not a fixed salary",
  },
  { value: "SALARY", label: "Full-Time Employee", helper: "Fixed monthly salary" },
] as const;

export type EngagementTypeValue = (typeof ENGAGEMENT_TYPE_OPTIONS)[number]["value"];

export const SKILLS_BY_POSITION: Record<PositionValue, string[]> = {
  TECHNICIAN_ELECTRICAL: [
    "Wiring",
    "Control Panel",
    "Motor",
    "Contactor",
    "MCB",
    "Electrical Troubleshooting",
    "PLC Basics",
    "Kitchen Equipment Service",
    "Installation",
    "Preventive Maintenance",
  ],
  TECHNICIAN_ELECTRONIC: [
    "PCB / Circuit Board Repair",
    "Control Board Troubleshooting",
    "Sensor Calibration",
    "Digital Display Repair",
    "Microcontroller Basics",
    "Kitchen Equipment Service",
    "Installation",
    "Preventive Maintenance",
  ],
  TECHNICIAN_REFRIGERATION: [
    "Compressor",
    "Gas Charging",
    "Leak Detection",
    "Deep Freezer",
    "Cold Room",
    "Chiller",
    "Ice Machine",
    "Under Counter Refrigerator",
    "Blast Chiller",
  ],
  TECHNICIAN_MECHANICAL: [
    "Fabrication",
    "Welding",
    "Gas Line",
    "Plumbing",
    "Kitchen Equipment Installation",
    "Stainless Steel Work",
    "Equipment Assembly",
    "Commercial Kitchen Equipment Knowledge",
  ],
  TECHNICIAN_INDUCTION: [
    "Induction Cooktop Repair",
    "Power Board Troubleshooting",
    "Coil Replacement",
    "Electrical Wiring",
    "Sensor Calibration",
    "Installation",
    "Preventive Maintenance",
  ],
  TECHNICIAN_COMMERCIAL_KITCHEN: [
    "Installation",
    "Breakdown Service",
    "Preventive Maintenance",
    "Commissioning",
    "Multi-Equipment Servicing",
    "General Equipment Handling",
  ],
};

export const EQUIPMENT_LIST = [
  "Combi Oven",
  "Conveyor Oven",
  "Pizza Oven",
  "Tilting Bratt Pan",
  "Bain Marie",
  "Salamander",
  "Deep Fryer",
  "Griddle",
  "Char Grill",
  "Shawarma Machine",
  "Dishwasher",
  "Vegetable Cutter",
  "Dough Kneader",
  "Spiral Mixer",
  "Planetary Mixer",
  "Exhaust System",
  "Fresh Air System",
  "Gas Bank",
  "Cold Room",
  "Walk-in Freezer",
  "Ice Machine",
  "All Commercial Kitchen Equipment",
];

export const WORK_CAPABILITY_LIST = [
  "Installation Experience",
  "Breakdown Service Experience",
  "Preventive Maintenance",
  "Commissioning",
  "Site Supervision",
  "Team Handling",
  "Can Travel Anywhere in India",
  "Passport Available",
  "Ready for Outstation Work",
  "Night Shift Ready",
];

export const GENDER_OPTIONS = ["Male", "Female", "Other"];

export const QUALIFICATION_OPTIONS = [
  "Below 10th",
  "10th Pass",
  "12th Pass",
  "ITI",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "Other",
];

export const TECHNICAL_QUALIFICATION_OPTIONS = [
  "ITI - Electrician",
  "ITI - Fitter",
  "ITI - Mechanic",
  "ITI - Refrigeration & Air Conditioning",
  "Diploma - Mechanical Engineering",
  "Diploma - Electrical Engineering",
  "Diploma - Electronics Engineering",
  "B.Tech / B.E. - Mechanical",
  "B.Tech / B.E. - Electrical",
  "B.Tech / B.E. - Electronics",
  "Not Applicable",
  "Other",
];

export const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

export const NOTICE_PERIOD_OPTIONS = [
  "Immediate",
  "15 Days",
  "1 Month",
  "2 Months",
  "3 Months",
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const STEP_TITLES = [
  "Select Position",
  "Verify Email",
  "Personal Details",
  "Education",
  "Experience",
  "Skills & Equipment",
  "Driving, Family & Bank",
  "Documents & Video",
  "Review & Submit",
] as const;
