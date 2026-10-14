-- Enable pg_cron in Supabase's Database > Extensions first.
-- Runs every minute; status/result requests also finish a due draw immediately.
select cron.schedule('office-new-year-draw', '* * * * *', 'select office_private.draw_if_due();');
