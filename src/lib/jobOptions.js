// Centralized, extensible option lists for job creation.
// Add new entries here — every consumer (JobForm, future filters) stays in sync.

export const LOCATIONS = [
  'Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai',
  'Kolkata', 'Ahmedabad', 'Gurugram', 'Noida', 'Jaipur', 'Chandigarh',
  'Remote',
];

export const INDUSTRIES = [
  'Information Technology', 'SaaS', 'Fintech', 'E-commerce', 'Healthcare',
  'EdTech', 'Manufacturing', 'Retail', 'Logistics', 'Real Estate',
  'Media & Entertainment', 'Consulting', 'Others',
];

export const DEPARTMENTS = [
  'Engineering / Technology', 'Product', 'Design', 'Sales', 'Marketing',
  'Finance', 'Human Resources', 'Operations', 'Customer Success', 'Legal',
  'Administration', 'Procurement', 'Business Development', 'Others',
];

// Each range maps to the underlying experience_min / experience_max
// numeric columns — the dropdown is just a friendlier way to set them.
export const EXPERIENCE_RANGES = [
  { label: 'Fresher / 0 years', min: 0, max: 0 },
  { label: '0–1 years', min: 0, max: 1 },
  { label: '1–3 years', min: 1, max: 3 },
  { label: '3–5 years', min: 3, max: 5 },
  { label: '5–8 years', min: 5, max: 8 },
  { label: '8–12 years', min: 8, max: 12 },
  { label: '12+ years', min: 12, max: null },
];

// Given stored min/max, find the closest matching preset label — used when
// editing an existing job so the dropdown reflects what's actually saved.
export function matchExperienceRange(min, max) {
  const found = EXPERIENCE_RANGES.find((r) => r.min === Number(min) && (r.max === (max === null || max === '' ? null : Number(max))));
  return found ? found.label : EXPERIENCE_RANGES[0].label;
}
