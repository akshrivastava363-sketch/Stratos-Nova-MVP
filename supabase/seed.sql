-- Optional demo content — run after schema.sql if you want the homepage populated.

insert into public.testimonials (name, role, company, quote, rating, is_featured) values
('Priya Sharma', 'Founder', 'Loopwave', 'We filled two engineering roles in under two weeks. The pre-screening actually saved us real time.', 5, true),
('Arjun Mehta', 'Head of Ops', 'Nimbus Labs', 'Finally a hiring tool that does not feel built for a 500-person company.', 5, true),
('Sneha Iyer', 'CEO', 'Fablehouse', 'The pipeline view alone was worth switching from spreadsheets.', 5, true);

insert into public.faqs (question, answer, sort_order) values
('Is Stratos Nova free to use?', 'Candidates always use the platform free. Employers get a free Starter tier with one active job post.', 1),
('How are candidates pre-screened?', 'Every candidate completes a structured profile with verified experience, skills, and availability before appearing in employer search results.', 2),
('Can I cancel my employer plan anytime?', 'Yes, plans are month-to-month with no lock-in.', 3),
('Do you support remote and hybrid roles?', 'Yes — jobs can be tagged remote, onsite, or hybrid and candidates can filter by work mode.', 4);
