'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 簡易翻訳辞書
const translations: Record<Language, Record<string, string>> = {
  ja: {
    // 共通
    'dashboard': 'ダッシュボード',
     'settings': '設定',
     'display_settings': '表示設定',
     'guide': '学習ガイド',
    'crm': 'CRM',
    'start_1on1': '1on1を開始',
    'recent_sessions': '最近のセッション',
    'no_sessions': 'セッションがありません',
    'loading': '読み込み中...',
    'error': 'エラー',
    'success': '成功',
    'save': '保存',
    'cancel': 'キャンセル',
    'delete': '削除',
    'edit': '編集',
    'add': '追加',
    'search': '検索',
    'filter': 'フィルター',
    'logout': 'ログアウト',
    'login': 'ログイン',
    'signup': '登録',
    'profile': 'プロフィール',
    'theme': 'テーマ',
     'language': '言語',
     'language_description': 'インターフェースの表示言語を選択します。変更は即時に反映されます。',
     'dark_mode': 'ダークモード',
    'light_mode': 'ライトモード',
    'system': 'システム',
    'notifications': '通知',
    'help': 'ヘルプ',
    'feedback': 'フィードバック',
    'version': 'バージョン',
    'about': 'について',
    'privacy': 'プライバシー',
    'terms': '利用規約',
    'contact': 'お問い合わせ',
    'support': 'サポート',
    'documentation': 'ドキュメント',
    'tutorial': 'チュートリアル',
    'faq': 'よくある質問',
    'blog': 'ブログ',
    'news': 'ニュース',
    'events': 'イベント',
    'community': 'コミュニティ',
    'forum': 'フォーラム',
    'chat': 'チャット',
    'email': 'メール',
    'phone': '電話',
    'address': 'アドレス',
    'website': 'ウェブサイト',
    'social': 'ソーシャル',
    'share': '共有',
    'like': 'いいね',
    'comment': 'コメント',
    'subscribe': '購読',
    'unsubscribe': '購読解除',
    'download': 'ダウンロード',
    'upload': 'アップロード',
    'install': 'インストール',
    'update': '更新',
    'upgrade': 'アップグレード',
    'downgrade': 'ダウングレード',
    'refresh': '更新',
    'restart': '再起動',
    'shutdown': 'シャットダウン',
    'reboot': '再起動',
    'configure': '設定',
    'customize': 'カスタマイズ',
    'personalize': 'パーソナライズ',
    'preferences': '設定',
    'options': 'オプション',
    'advanced': '詳細設定',
    'basic': '基本設定',
    'simple': 'シンプル',
    'detailed': '詳細',
    'summary': '概要',
    'details': '詳細',
    'overview': '概要',
    'statistics': '統計',
    'analytics': '分析',
    'reports': 'レポート',
    'logs': 'ログ',
    'history': '履歴',
    'activity': 'アクティビティ',
    'performance': 'パフォーマンス',
    'security': 'セキュリティ',
    'privacy_settings': 'プライバシー設定',
    'account': 'アカウント',
    'billing': '課金',
    'payment': '支払い',
    'invoice': '請求書',
    'receipt': '領収書',
    'subscription': 'サブスクリプション',
    'trial': 'トライアル',
    'free': '無料',
    'paid': '有料',
    'premium': 'プレミアム',
    'enterprise': 'エンタープライズ',
    'business': 'ビジネス',
    'personal': '個人',
    'family': '家族',
    'team': 'チーム',
    'organization': '組織',
    'company': '会社',
    'school': '学校',
    'university': '大学',
    'government': '政府',
    'nonprofit': '非営利',
    'startup': 'スタートアップ',
    'small_business': '中小企業',
    'medium_business': '中規模企業',
    'large_business': '大規模企業',
    'corporation': '企業',
    'partnership': 'パートナーシップ',
    'sole_proprietorship': '個人事業',
    'llc': 'LLC',
    'inc': '株式会社',
    'ltd': '有限会社',
    'gmbh': 'GmbH',
    'sa': 'SA',
    'nv': 'NV',
    'pte': 'PTE',
    'llp': 'LLP',
    'plc': 'PLC',
    'ag': 'AG',
    'sarl': 'SARL',
    'spa': 'SPA',
    'sas': 'SAS',
    'sc': 'SC',
    'scs': 'SCS',
    'snc': 'SNC',
    'srl': 'SRL',
    'kgaa': 'KGAA',
    'se': 'SE',
    'sl': 'SL',
    'sa de cv': 'SA de CV',
    'sab de cv': 'SAB de CV',
    'sa de rl': 'SA de RL',
    's de rl': 'S de RL',
    'sc de rl': 'SC de RL',
    's en c': 'S en C',
    's en n': 'S en N',
    's en p': 'S en P',
    's en rl': 'S en RL',
    's en x': 'S en X',
    's en y': 'S en Y',
    's en z': 'S en Z',
    // CRM関連
    'subordinate_management': '部下管理',
    'add_subordinate': '部下を追加',
    'name': '名前',
    'role': '役職',
    'department': '部署',
    'traits': '特性',
    'trait_analysis': '特性分析',
    'upload_pdf': 'PDFをアップロード',
    'analyze': '分析',
    'analyzing': '分析中',
    'upload_failed': 'アップロードに失敗しました',
    'please_try_again': 'もう一度お試しください',
    'pdf_analyzed': 'PDFを分析しました',
    'traits_extracted': '個の特性を抽出しました',
    'failed_to_analyze': '分析に失敗しました',
    'no_traits_yet': 'まだ特性が分析されていません',
    'upload_evaluation_pdf': '評価PDFをアップロード',
    'ai_will_analyze': 'AIがPDFを分析し、特性を自動抽出します',
    'subordinate_details': '部下詳細',
    'user_info': 'ユーザー情報',
    'detected_traits': '検出された特性',
    'analysis_data': '分析データ',
    'upload_analyze_pdf': 'PDFをアップロードして分析',
    'upload_pdf_evaluation': 'PDF評価レポートをアップロードしてください',
    'ai_extract_personality': 'AIが性格特性を抽出します',
    // セッション関連
    'end_session': 'セッション終了',
    'leave_session': 'セッション退出',
    'switch_to_dashboard': 'ダッシュボードに切り替え',
    'switch_to_mindmap': 'マインドマップに切り替え',
    'switch_to_video': 'ビデオに切り替え',
    'copy_invite_link': '招待リンクをコピー',
    'live_transcript': 'ライブ文字起こし',
    'waiting_for_conversation': '会話を待機中',
    'speak_into_microphone': 'マイクに向かって話してください',
    'real_time_advice': 'リアルタイムアドバイス',
    'add_topic': 'トピック追加',
    'initializing_session': 'セッションを初期化中',
    'web_mode': 'Web会議モード',
    'face_to_face_mode': '対面モード',
    'subordinate_view': '部下ビュー',
    'participant': '参加者',
    // 設定関連
     'integrations': '連携',
     'google_calendar': 'Googleカレンダー',
     'calendar_integration_available': 'カレンダー連携が利用可能です',
     'sign_in_with_google_to_enable': 'Googleでサインインしてカレンダー連携を有効にしてください',
     'line': 'LINE',
     'line_description': 'リマインダーや通知をLINEで送信します。',
    'connect': '連携する',
    'disconnect': '連携を解除',
    'connected': '連携済み',
    'not_connected': '未連携',
    'redirecting_to_google': 'Google認証にリダイレクト中',
    'failed_to_connect_google': 'Googleカレンダーの連携に失敗しました',
    'google_calendar_disconnected': 'Googleカレンダーの連携を解除しました',
    'token_cleared_locally': 'トークンをローカルで削除',
    'failed_to_disconnect_google': 'Googleカレンダーの切断に失敗しました',
    'line_integration_started': 'LINE連携を開始しました',
    'failed_to_connect_line': 'LINE連携に失敗しました',
     'line_disconnected': 'LINE連携を解除しました',
     'mock_implementation': 'モック実装',
     'note_google_calendar_enabled': 'Googleカレンダー連携が有効です。次回の1on1セッションをスケジュールできます。',
     'restriction_google_calendar_requires_login': 'Googleカレンダー連携を使用するには、Googleアカウントでログインしてください。',
     'logout_successful': 'ログアウトしました',
     'logout_failed': 'ログアウトに失敗しました',
    // ガイド関連
    'learning_guide': '学習ガイド',
    'for_managers': '上司向け',
    'for_subordinates': '部下向け',
    // 認証関連
     'login_successful': 'ログインしました',
     'login_failed': 'ログインに失敗しました',
     'logged_in_with_google': 'Googleアカウントでログイン中',
     'logged_in_with_email': 'メールアドレスでログイン中',
     'checking_auth_status': '認証ステータスを確認中...',
     'registration_successful': '登録が完了しました',
     'check_email': '確認メールをご確認ください',
     'registration_failed': '登録に失敗しました',
     'passwords_do_not_match': 'パスワードが一致しません',
    // スケジュール関連
    'schedule_next_meeting': '次回のミーティングをスケジュール',
    'select_date_time': '日付と時間を選択してください',
    'user_id_not_found': 'ユーザーIDが見つかりません',
    'line_reminder_may_not_work': 'LINEリマインダーが機能しない可能性があります',
    'added_to_google_calendar': 'Googleカレンダーに追加しました',
    'line_reminder_failed': 'LINEリマインダーの設定に失敗しました',
    'try_again_later': '後で設定ページから再度試してください',
    'next_session_scheduled': '次回の1on1セッションをGoogleカレンダーに追加しました',
    'schedule_failed': 'スケジュール作成に失敗しました',
    // LiveKit関連
    'livekit_config_missing': 'LiveKit設定がありません',
    'configure_livekit_keys': '.env.localファイルでLIVEKIT_API_KEYとLIVEKIT_API_SECRETを設定してください',
    'enable_real_video_calls': '実際のビデオ通話を有効にしてください',
    'mock_mode_active': 'モックモード有効',
    'connecting_to_livekit': 'LiveKitに接続中',
    'failed_to_fetch_token': 'トークンの取得に失敗しました',
    // その他
    'subordinate': '部下',
    'manager': 'マネージャー',
    'ai': 'AI',
    'transcript': '文字起こし',
    'manual': '手動',
     'note': 'メモ',
     'attention': '注意',
     'restriction': '制限',
     'ai_question_mode': 'AI質問モード',
     'note_mode': 'メモモード',
    'press_tab_to_switch': 'Tabキーで切り替え',
    'ctrl_enter_to_send': 'Ctrl+Enterで送信',
    'ctrl_enter_to_add': 'Ctrl+Enterで追加',
    'ask_ai': 'AIに質問',
    'add_note': 'メモを追加',
    'no_notes': 'メモがありません',
    'add_note_please': 'メモを追加してください',
  },
   en: {
     // 英語はキーと同じ（デフォルト）
     'language_description': 'Select the interface language. Changes take effect immediately.',
     'calendar_integration_available': 'Calendar integration is available.',
     'sign_in_with_google_to_enable': 'Sign in with Google to enable calendar integration.',
     'line_description': 'Send reminders and notifications via LINE.',
     'note_google_calendar_enabled': 'Google Calendar integration is enabled. You can schedule the next 1on1 session.',
     'restriction_google_calendar_requires_login': 'To use Google Calendar integration, please log in with a Google account.',
     'attention': 'Note:',
     'restriction': 'Restriction:',
     'logged_in_with_google': 'Logged in with Google',
     'logged_in_with_email': 'Logged in with email',
     'checking_auth_status': 'Checking authentication status...',
   }
};

// 英語の翻訳はキーをそのまま使用
Object.keys(translations.ja).forEach(key => {
  if (!translations.en[key]) {
    translations.en[key] = key;
  }
});

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({ children, defaultLanguage = 'ja' }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    // ローカルストレージから言語設定を読み込む
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ja' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations['en'][key] || key;
    
    if (params) {
      Object.keys(params).forEach(paramKey => {
        text = text.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}