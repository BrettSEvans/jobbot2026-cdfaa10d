UPDATE public.live_dashboards
SET dashboard_data = jsonb_set(
  dashboard_data,
  '{cfoScenarios,0,baseline}',
  '{"volume": 15, "revenue": 75000}'::jsonb
)
WHERE slug_company = 'suger';