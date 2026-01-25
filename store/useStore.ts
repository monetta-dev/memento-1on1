import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Node, Edge } from '@xyflow/react';


export interface TranscriptItem {
  speaker: 'manager' | 'subordinate';
  text: string;
  timestamp: string;
}

export interface MindMapData {
  nodes: Node[];
  edges: Edge[];
  actionItems?: string[];
}

export interface AgendaItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  content: string;
  timestamp: string;
  source?: 'manual' | 'ai' | 'transcript';
}

export interface Subordinate {
  id: string;
  name: string;
  role: string;
  department: string;
  traits: string[];
  lastOneOnOne?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  subordinateId: string; // CamelCase for internal use, mapped from snake_case DB
  date: string;
  mode: 'face-to-face' | 'web';
  theme: string;
  summary?: string;
  transcript?: TranscriptItem[];
  mindMapData?: MindMapData;
  agendaItems?: AgendaItem[];
  notes?: Note[];
  status: 'scheduled' | 'completed' | 'live';
  created_at?: string;
}

interface AppState {
  subordinates: Subordinate[];
  sessions: Session[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSubordinates: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  addSubordinate: (sub: Omit<Subordinate, 'id' | 'created_at'>) => Promise<void>;
  updateSubordinate: (id: string, updates: Partial<Subordinate>) => Promise<void>;
  addSession: (session: Omit<Session, 'id' | 'created_at' | 'status'>) => Promise<string | null>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  getSession: (id: string) => Session | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  subordinates: [],
  sessions: [],
  isLoading: false,
  error: null,

  fetchSubordinates: async () => {
    if (!supabase) return;
    set({ isLoading: true });
    const { data, error } = await supabase.from('subordinates').select('*').order('created_at', { ascending: false });
    if (error) {
      set({ error: error.message, isLoading: false });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedData = data.map((item: any) => ({
        ...item,
        traits: typeof item.traits === 'string' ? JSON.parse(item.traits) : item.traits
      }));
      set({ subordinates: mappedData, isLoading: false });
    }
  },

  fetchSessions: async () => {
    console.log('fetchSessions called, supabase:', !!supabase);
    if (!supabase) {
      console.log('fetchSessions: supabase is null, returning early');
      return;
    }
    set({ isLoading: true });
    const { data, error } = await supabase.from('sessions').select('*').order('date', { ascending: false });
    if (error) {
      console.error('fetchSessions error:', error);
      set({ error: error.message, isLoading: false });
    } else {
      console.log('fetchSessions success, data count:', data?.length || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedData = data.map((item: any) => ({
        id: item.id,
        subordinateId: item.subordinate_id,
        date: item.date,
        mode: item.mode,
        theme: item.theme,
        summary: item.summary,
        status: item.status,
        transcript: item.transcript,
        mindMapData: item.mind_map_data,
        agendaItems: item.agenda_items,
        notes: item.notes
      }));
      set({ sessions: mappedData, isLoading: false });
    }
  },

  addSubordinate: async (sub) => {
    if (!supabase) return;
    set({ isLoading: true });
    const { data, error } = await supabase.from('subordinates').insert([{
      name: sub.name,
      role: sub.role,
      department: sub.department,
      traits: sub.traits
    }]).select();

    if (error) {
      set({ error: error.message, isLoading: false });
    } else if (data) {
      const newSub = data[0];
      set((state) => ({ 
        subordinates: [newSub, ...state.subordinates],
        isLoading: false 
      }));
    }
  },

  addSession: async (session) => {
    if (!supabase) return null;
    set({ isLoading: true });
    

    
    const { data, error } = await supabase.from('sessions').insert([{
      subordinate_id: session.subordinateId,
      date: session.date,
      mode: session.mode,
      theme: session.theme,
      status: 'live', // Start as live immediately for this prototype flow
      transcript: [],
      mind_map_data: {}
    }]).select();

    if (error) {
      set({ error: error.message, isLoading: false });
      return null;
    } else if (data) {
      const newSession = {
        ...data[0],
        subordinateId: data[0].subordinate_id,
        mindMapData: data[0].mind_map_data
      };
      set((state) => ({ 
        sessions: [newSession, ...state.sessions],
        isLoading: false 
      }));
      

      
      return newSession.id;
    }
    return null;
  },

  updateSubordinate: async (id, updates) => {
    if (!supabase) return;
    // Optimistic update
    set((state) => ({
      subordinates: state.subordinates.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));

    // DB map
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.department) dbUpdates.department = updates.department;
    if (updates.traits) dbUpdates.traits = updates.traits;
    if (updates.lastOneOnOne) dbUpdates.last_one_on_one = updates.lastOneOnOne;

    const { error } = await supabase.from('subordinates').update(dbUpdates).eq('id', id);
    if (error) {
      console.error("Failed to sync subordinate update", error);
      // Revert or show error could be handled here
    }
  },

  updateSession: async (id, updates) => {
    if (!supabase) return;
    console.log('updateSession called:', { id, updates });
    // Optimistic update
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));

    // DB map
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.summary) dbUpdates.summary = updates.summary;
    if (updates.transcript) dbUpdates.transcript = updates.transcript;
    if (updates.mindMapData) {
      // Log mindmap data structure for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('MindMapData to save:', {
          nodesCount: updates.mindMapData.nodes?.length || 0,
          edgesCount: updates.mindMapData.edges?.length || 0,
          nodesSample: updates.mindMapData.nodes?.slice(0, 1),
          edgesSample: updates.mindMapData.edges?.slice(0, 1),
        });
      }
      dbUpdates.mind_map_data = updates.mindMapData;
    }
    if (updates.agendaItems) dbUpdates.agenda_items = updates.agendaItems;
    if (updates.notes) dbUpdates.notes = updates.notes;

    console.log('Updating Supabase session with:', dbUpdates);
    try {
      const { error, data } = await supabase
        .from('sessions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error("Failed to sync session update", {
          errorMessage: error?.message,
          errorDetails: error?.details,
          errorHint: error?.hint,
          errorCode: error?.code,
          errorFull: error,
          dbUpdates,
          id,
          timestamp: new Date().toISOString()
        });
        // Revert or show error could be handled here
      } else {
        console.log('Supabase session update successful', data);
      }
    } catch (err) {
      console.error('Unexpected error updating session:', err);
    }
  },

  getSession: (id) => get().sessions.find((s) => s.id === id),
}));
