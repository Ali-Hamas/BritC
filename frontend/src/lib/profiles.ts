import { supabase } from './supabase';

export class BusinessProfile {
    id?: string;
    businessName: string = '';
    industry: string = '';
    audience: string = '';
    revenueGoal: string = '';
    userId?: string;
    createdAt?: string;
    plan: 'free' | 'pro' = 'pro'; // Defaulting to pro for this demo

    constructor(init?: Partial<BusinessProfile>) {
        Object.assign(this, init);
    }
}

export const ProfileService = {
    async saveProfile(profile: BusinessProfile, userId: string) {
        try {
            const profileData = {
                business_name: profile.businessName,
                industry: profile.industry,
                summary: profile.audience,
                goals: [profile.revenueGoal],
                user_id: userId
            };

            const { data, error } = await supabase
                .from('profiles')
                .upsert(profileData)
                .select()
                .single();

            if (error) throw error;
            
            const mapped = this.mapToFrontend(data);
            localStorage.setItem('britsync_profile', JSON.stringify(mapped));
            return mapped;
        } catch (error) {
            console.warn('Supabase save failed, using local storage fallback:', error);
            const localData = new BusinessProfile({
                ...profile,
                userId: userId,
                id: 'local-session',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('britsync_profile', JSON.stringify(localData));
            return localData;
        }
    },

    async getLatestProfile(userId: string) {
        if (!userId) return null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .maybeSingle();

            if (error) throw error;
            if (data) {
                const mapped = this.mapToFrontend(data);
                localStorage.setItem('britsync_profile', JSON.stringify(mapped));
                return mapped;
            }
        } catch (error) {
            console.warn('Supabase fetch failed, checking local storage:', error);
        }

        const local = localStorage.getItem('britsync_profile');
        if (local) {
            const parsed = JSON.parse(local);
            if (parsed.userId === userId) return parsed;
        }
        return null;
    },

    mapToFrontend(dbProfile: any): BusinessProfile {
        return new BusinessProfile({
            id: dbProfile.id,
            businessName: dbProfile.business_name,
            industry: dbProfile.industry,
            audience: dbProfile.summary,
            revenueGoal: dbProfile.goals?.[0] || '',
            userId: dbProfile.user_id,
            createdAt: dbProfile.created_at,
            plan: dbProfile.plan || 'pro'
        });
    }
};
