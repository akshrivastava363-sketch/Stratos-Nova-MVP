-- Optional demo content for a fresh install.
insert into public.testimonials (name, role, company, quote, rating, is_featured) values
('Priya Sharma', 'Founder', 'Loopwave', 'We filled two engineering roles in under two weeks.', 5, true),
('Arjun Mehta', 'Head of Ops', 'Nimbus Labs', 'Finally a hiring tool that does not feel built for a 500-person company.', 5, true);

insert into public.faqs (question, answer, sort_order) values
('Is Stratos Nova free to use?', 'Candidates always use the platform free. Employers get a free Starter tier with one active job post.', 1),
('How are candidates verified?', 'Education and employment records go through a modular verification workflow — status shows as unverified, pending, verified, or failed.', 2),
('What is Recruiter Assist?', 'If an employer cannot fill a role themselves, they can hand it to an internal recruiter who works the same ATS pipeline on their behalf.', 3);

insert into public.assessment_templates (role_category, title, description, duration_minutes, passing_score, question_count) values
('developer', 'Frontend Developer Assessment', 'Covers HTML/CSS/JS fundamentals and React basics.', 30, 60, 20),
('hr', 'HR Generalist Assessment', 'Covers recruitment, compliance, and employee relations basics.', 25, 60, 15),
('sales', 'Sales Aptitude Assessment', 'Covers negotiation, objection handling, and pipeline management.', 20, 60, 15);
