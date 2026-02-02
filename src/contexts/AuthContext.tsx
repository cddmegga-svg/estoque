
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password?: string) => Promise<void>;
    signUp: (email: string, password: string, data: any) => Promise<void>;
    signOut: () => Promise<void>;
    activeEmployee?: User | null;
    setActiveEmployee?: (employee: User | null) => void;
    checkPermission?: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => { },
    signUp: async () => { },
    signOut: async () => { },
    activeEmployee: null,
    setActiveEmployee: () => { },
    checkPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user?.email) {
                fetchUserProfile(session.user.email);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user?.email) {
                fetchUserProfile(session.user.email);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (email: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
            } else if (data) {
                const appUser: User = {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    filialId: data.filial_id,
                    permissions: data.permissions || [],
                };
                setUser(appUser);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password?: string) => {
        if (password) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
        }
    };

    const signUp = async (email: string, password: string, userData: any) => {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        if (authData.user) {
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: email,
                    name: userData.name,
                    role: userData.role || 'viewer',
                    filial_id: userData.filialId
                });

            if (profileError) {
                console.error("Error creating user profile", profileError);
                // Optional: delete auth user if profile creation fails
                throw profileError;
            }
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    // activeEmployee state for "Unlock Mode"
    const [activeEmployee, setActiveEmployee] = useState<User | null>(() => {
        const saved = sessionStorage.getItem('unlocked_employee');
        if (saved) console.log("AuthContext: Restored unlocked employee", JSON.parse(saved));
        return saved ? JSON.parse(saved) : null;
    });

    const checkPermission = (permission: string) => {
        // 1. If an Employee is "Unlocked" (e.g. Manager override), check their permissions
        if (activeEmployee) {
            const has = activeEmployee.permissions?.includes(permission) || activeEmployee.role === 'admin';
            // console.log(`Check(Emp): ${permission} -> ${has} (${activeEmployee.name})`);
            return has;
        }
        // 2. Fallback to logged in User (Store Login)
        const userHas = user?.permissions?.includes(permission) || user?.role === 'admin';
        // console.log(`Check(User): ${permission} -> ${userHas}`);
        return userHas;
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, activeEmployee, setActiveEmployee, checkPermission }}>
            {children}
        </AuthContext.Provider>
    );
};
