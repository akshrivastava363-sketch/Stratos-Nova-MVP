export const PROFILE_COMPLETION_FIELDS = [
  ['headline', 'Headline'],
  ['bio', 'Bio'],
  ['location', 'Current location'],
  ['preferred_location', 'Preferred location'],
  ['expected_salary_min', 'Expected salary'],
  ['resume_url', 'Resume'],
  ['linkedin_url', 'LinkedIn URL'],
  ['availability', 'Availability'],
  ['notice_period', 'Notice period'],
  ['work_mode_preference', 'Work mode preference'],
];

export function calcCompletion(profile = {}, skillsCount = 0, eduCount = 0, expCount = 0) {
  const fields = [
    profile.headline,
    profile.bio,
    profile.location,
    profile.preferred_location,
    profile.expected_salary_min,
    profile.resume_url,
    profile.linkedin_url,
    profile.availability,
    profile.notice_period,
    profile.work_mode_preference,
    (profile.languages || []).length > 0,
    eduCount > 0,
    expCount > 0,
    skillsCount > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function getMissingProfileItems(profile = {}, skillsCount = 0, eduCount = 0, expCount = 0) {
  const missing = PROFILE_COMPLETION_FIELDS
    .filter(([key]) => !profile[key])
    .map(([, label]) => label);

  if (!(profile.languages || []).length) missing.push('Languages');
  if (!eduCount) missing.push('Education');
  if (!expCount) missing.push('Employment history');
  if (!skillsCount) missing.push('Skills');
  return missing;
}
