-- Insert user profile for the existing user
INSERT INTO public.user_profiles (id, email, full_name, is_active)
VALUES ('ef09be4d-1e7b-44b7-be7e-32fcacbb7b29', 'bhavyagupta294@gmail.com', 'Bhavya Gupta', true)
ON CONFLICT (id) DO NOTHING;