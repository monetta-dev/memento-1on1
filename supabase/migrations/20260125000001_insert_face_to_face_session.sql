-- Insert sample face-to-face session for testing

-- Get subordinate ID for 山田 太郎
WITH subordinate_id AS (
  SELECT id FROM public.subordinates WHERE name = '山田 太郎' LIMIT 1
)
INSERT INTO public.sessions (
  subordinate_id,
  date,
  mode,
  theme,
  status,
  transcript,
  mind_map_data,
  agenda_items,
  notes
) 
SELECT 
  id,
  NOW() - INTERVAL '2 days',
  'face-to-face',
  '四半期レビューと目標設定',
  'completed',
  '[
    {"speaker": "manager", "text": "今期の業績についてどう感じていますか？", "timestamp": "10:00"},
    {"speaker": "subordinate", "text": "プロジェクトAは予定通り完了しましたが、プロジェクトBが少し遅れています", "timestamp": "10:02"},
    {"speaker": "manager", "text": "遅れの原因は何だと思いますか？", "timestamp": "10:05"},
    {"speaker": "subordinate", "text": "要件定義の変更が多かったためです。次回は初期段階でしっかり合意を取りたいです", "timestamp": "10:07"}
  ]'::jsonb,
  '{
    "nodes": [
      {"id": "1", "position": {"x": 0, "y": 0}, "data": {"label": "四半期レビュー"}},
      {"id": "2", "position": {"x": 200, "y": 0}, "data": {"label": "プロジェクトA: 完了"}},
      {"id": "3", "position": {"x": 200, "y": 100}, "data": {"label": "プロジェクトB: 遅延"}}
    ],
    "edges": [
      {"id": "e1-2", "source": "1", "target": "2"},
      {"id": "e1-3", "source": "1", "target": "3"}
    ],
    "actionItems": ["次回までにプロジェクトBの遅延原因分析を完了", "四半期目標の見直し"]
  }'::jsonb,
  '[
    {"id": "1", "text": "四半期業績レビュー", "completed": true},
    {"id": "2", "text": "プロジェクトA/Bの進捗確認", "completed": true},
    {"id": "3", "text": "次期目標設定", "completed": false}
  ]'::jsonb,
  '[
    {"id": "1", "content": "山田さんは今期の業績に満足している", "timestamp": "10:01", "source": "manual"},
    {"id": "2", "content": "プロジェクトBの遅延は要件変更が原因", "timestamp": "10:06", "source": "transcript"},
    {"id": "3", "content": "次回までに遅延分析を完了させる", "timestamp": "10:10", "source": "ai"}
  ]'::jsonb
FROM subordinate_id
ON CONFLICT DO NOTHING;