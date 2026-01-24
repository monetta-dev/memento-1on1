-- LINE通知設定テーブル
CREATE TABLE IF NOT EXISTS public.line_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    line_user_id TEXT UNIQUE, -- LINEユーザーID（OAuth連携後）
    line_access_token TEXT, -- 暗号化されたアクセストークン
    line_display_name TEXT, -- LINE表示名
    enabled BOOLEAN DEFAULT true,
    notification_types JSONB DEFAULT '["reminder", "summary", "follow_up"]'::JSONB,
    remind_before_minutes INTEGER DEFAULT 30, -- リマインダー時間（分前）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- 通知ログテーブル
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL, -- 'reminder', 'summary', 'follow_up', 'error'
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_line_notifications_user_id ON public.line_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_line_notifications_line_user_id ON public.line_notifications(line_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_session_id ON public.notification_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);

-- RLS有効化
ALTER TABLE public.line_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：ユーザーは自分のLINE通知設定のみアクセス可能
CREATE POLICY "Users can manage own LINE notifications" ON public.line_notifications
    FOR ALL USING (auth.uid() = user_id);

-- RLSポリシー：ユーザーは自分の通知ログのみアクセス可能
CREATE POLICY "Users can view own notification logs" ON public.notification_logs
    FOR ALL USING (auth.uid() = user_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_line_notifications_updated_at 
    BEFORE UPDATE ON public.line_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();