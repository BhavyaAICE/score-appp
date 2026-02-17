/**
 * Authentication Service
 * Secure authentication with JWT, refresh tokens, and security features
 */

import { supabase } from '../supabaseClient';
import { rbacService, Roles } from './rbacService';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export const authService = {
  async signUp(email, password, fullName) {
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(', ') };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      try {
        await rbacService.createUserProfile(
          data.user.id,
          email,
          fullName,
          Roles.VIEWER
        );
      } catch (profileError) {
        console.error('Profile creation handled by trigger:', profileError);
      }
    }

    return { success: true, data };
  },

  async signIn(email, password) {
    const profile = await this.getProfileByEmail(email);

    if (profile) {
      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(profile.locked_until) - new Date()) / 60000
        );
        return {
          success: false,
          error: `Account locked. Try again in ${remainingMinutes} minutes.`
        };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("SignIn error:", error);
      if (profile) {
        await this.recordFailedLogin(profile.id);
      }
      return { success: false, error: 'Invalid email or password' };
    }

    if (profile) {
      await this.recordSuccessfulLogin(profile.id);
    }

    // Wrap audit log in try-catch to not block login on audit failure
    try {
      await rbacService.createAuditLog(
        data.user.id,
        'login',
        'auth',
        data.user.id
      );
    } catch (auditError) {
      console.warn("Failed to create login audit log:", auditError);
    }

    return { success: true, data };
  },

  async signOut() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await rbacService.createAuditLog(
        session.user.id,
        'logout',
        'auth',
        session.user.id
      );

      await supabase
        .from('refresh_tokens')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: 'logout'
        })
        .eq('user_id', session.user.id)
        .is('revoked_at', null);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, session };
  },

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async updatePassword(newPassword) {
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(', ') };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('user_profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('id', session.user.id);

      await rbacService.createAuditLog(
        session.user.id,
        'password_change',
        'auth',
        session.user.id
      );
    }

    return { success: true, data };
  },

  validatePassword(password) {
    const errors = [];

    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
      errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
    }

    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
      criteria: {
        length: password.length >= PASSWORD_REQUIREMENTS.minLength,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
      }
    };
  },

  async updateProfile(updates) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "No authenticated user" };

    try {
      // 1. Update auth metadata if name is changing
      if (updates.full_name) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { name: updates.full_name }
        });
        if (metaError) throw metaError;
      }

      // 2. Update user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      await rbacService.createAuditLog(
        user.id,
        'update',
        'user_profiles',
        user.id,
        null, // old value (simplified)
        updates
      );

      return { success: true, data };
    } catch (error) {
      console.error("Profile update error:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No authenticated user" };

    try {
      // Create audit log before deletion attempt
      await rbacService.createAuditLog(
        user.id,
        'account_delete_request',
        'users',
        user.id
      );

      // Try RPC method first (preferred if set up)
      const { error: rpcError } = await supabase.rpc('delete_own_account');

      // 3. Delete teams created by user (if any)
      const { error: teamsError } = await supabase
        .from('teams')
        .delete()
        .eq('created_by', user.id); // Assuming created_by exists

      if (teamsError) {
        console.warn("Teams deletion warning:", teamsError);
        // Continue, as this might not exist or be critical
      }

      if (rpcError) {
        // Fallback: Delete related data manually to avoid FK constraint errors

        // 1. Delete user roles
        await supabase.from('user_roles').delete().eq('user_id', user.id);

        // 2. Delete event admin assignments
        await supabase.from('event_admin_assignments').delete().eq('user_id', user.id);

        // 3. Delete audit logs
        await supabase.from('audit_logs').delete().eq('user_id', user.id);

        // 4. Handle events created by user (orphan them if possible to preserve data)
        const { error: orphanError } = await supabase
          .from('events')
          .update({ created_by: null })
          .eq('created_by', user.id);

        if (orphanError) {
          // If we can't orphan (e.g. not nullable), we might have to delete, but that's destructive.
          // For now, let's log it. The profile delete might fail if this didn't work.
          console.warn("Could not orphan events:", orphanError);
        }
      }

      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        // If direct delete fails, we assume we can't delete self without admin
        throw new Error("Unable to delete account. Please contact support.");
      }

      await this.signOut();
      return { success: true };
    } catch (error) {
      console.error("Delete account error:", error);
      return { success: false, error: error.message };
    }
  },

  async getProfileByEmail(email) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  async recordFailedLogin(userId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('failed_login_attempts')
      .eq('id', userId)
      .single();

    const attempts = (profile?.failed_login_attempts || 0) + 1;
    const updates = {
      failed_login_attempts: attempts,
      updated_at: new Date().toISOString()
    };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.locked_until = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60000
      ).toISOString();

      await supabase
        .from('security_alerts')
        .insert([{
          user_id: userId,
          alert_type: 'account_locked',
          severity: 'high',
          description: `Account locked after ${attempts} failed login attempts`
        }]);
    }

    await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);
  },

  async recordSuccessfulLogin(userId) {
    await supabase
      .from('user_profiles')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  },

  async checkPasswordAge(userId, maxAgeDays = 90) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('password_changed_at')
      .eq('id', userId)
      .single();

    if (!profile?.password_changed_at) {
      return { expired: false, daysOld: 0 };
    }

    const passwordAge = Date.now() - new Date(profile.password_changed_at).getTime();
    const daysOld = Math.floor(passwordAge / (1000 * 60 * 60 * 24));

    return {
      expired: daysOld >= maxAgeDays,
      daysOld,
      expiresIn: maxAgeDays - daysOld
    };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export default authService;
