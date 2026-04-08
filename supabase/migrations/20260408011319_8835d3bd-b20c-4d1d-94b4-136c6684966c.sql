
UPDATE public.live_dashboards
SET dashboard_data = jsonb_set(
  dashboard_data,
  '{sections}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'playbook-performance' THEN
          elem
          || jsonb_build_object('charts', jsonb_build_array(
            jsonb_build_object(
              'id', 'playbook-chapter-downloads',
              'title', 'Playbook Downloads by Chapter',
              'type', 'bar',
              'data', jsonb_build_object(
                'labels', jsonb_build_array('Co-Sell Motions', 'Marketplace Listing', 'Technical Integration', 'Partner Strategy', 'Field Enablement', 'Pricing & Packaging'),
                'datasets', jsonb_build_array(
                  jsonb_build_object(
                    'label', 'Downloads',
                    'data', jsonb_build_array(4490, 2820, 1930, 1580, 1210, 810),
                    'backgroundColor', '#FF6B35'
                  ),
                  jsonb_build_object(
                    'label', 'Avg. Time Spent (min)',
                    'data', jsonb_build_array(8.2, 6.5, 9.1, 5.3, 4.8, 3.9),
                    'backgroundColor', '#64748B'
                  )
                )
              )
            ),
            jsonb_build_object(
              'id', 'content-engagement-trend',
              'title', 'Weekly Content Engagement Trend',
              'type', 'area',
              'data', jsonb_build_object(
                'labels', jsonb_build_array('W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'),
                'datasets', jsonb_build_array(
                  jsonb_build_object(
                    'label', 'Unique Visitors',
                    'data', jsonb_build_array(320, 410, 380, 520, 610, 580, 720, 690),
                    'borderColor', '#FF6B35',
                    'backgroundColor', 'rgba(255, 107, 53, 0.2)',
                    'fill', true
                  ),
                  jsonb_build_object(
                    'label', 'Return Visitors',
                    'data', jsonb_build_array(80, 120, 110, 180, 210, 250, 310, 290),
                    'borderColor', '#64748B',
                    'backgroundColor', 'rgba(100, 116, 139, 0.2)',
                    'fill', true
                  )
                )
              )
            )
          ))
          || jsonb_build_object('tables', jsonb_build_array(
            jsonb_build_object(
              'id', 'playbook-content-performance',
              'title', 'Content Asset Performance',
              'columns', jsonb_build_array(
                jsonb_build_object('key', 'asset', 'label', 'Content Asset'),
                jsonb_build_object('key', 'format', 'label', 'Format'),
                jsonb_build_object('key', 'views', 'label', 'Views'),
                jsonb_build_object('key', 'downloads', 'label', 'Downloads'),
                jsonb_build_object('key', 'mqls', 'label', 'MQLs Generated'),
                jsonb_build_object('key', 'convRate', 'label', 'Conv. Rate')
              ),
              'rows', jsonb_build_array(
                jsonb_build_object('asset', 'Co-Sell Motion Playbook', 'format', 'PDF Guide', 'views', '4,210', 'downloads', '1,840', 'mqls', '92', 'convRate', '5.0%'),
                jsonb_build_object('asset', 'Marketplace Listing Best Practices', 'format', 'Interactive Guide', 'views', '3,150', 'downloads', '1,420', 'mqls', '71', 'convRate', '5.0%'),
                jsonb_build_object('asset', 'Technical Integration Workshop', 'format', 'Video + Repo', 'views', '2,680', 'downloads', '980', 'mqls', '68', 'convRate', '6.9%'),
                jsonb_build_object('asset', 'Partner Strategy Framework', 'format', 'Template Kit', 'views', '1,920', 'downloads', '810', 'mqls', '54', 'convRate', '6.7%'),
                jsonb_build_object('asset', 'Field Enablement Toolkit', 'format', 'Slide Deck', 'views', '1,540', 'downloads', '620', 'mqls', '38', 'convRate', '6.1%'),
                jsonb_build_object('asset', 'Cloud GTM Webinar Recording', 'format', 'Video', 'views', '2,340', 'downloads', '890', 'mqls', '45', 'convRate', '5.1%'),
                jsonb_build_object('asset', 'Pricing & Packaging Guide', 'format', 'PDF Guide', 'views', '980', 'downloads', '410', 'mqls', '23', 'convRate', '5.6%')
              )
            )
          ))
        ELSE elem
      END
    )
    FROM jsonb_array_elements(dashboard_data->'sections') AS elem
  )
)
WHERE id = 'eae31235-f5ce-4bd3-8adb-b6d69e909728';
