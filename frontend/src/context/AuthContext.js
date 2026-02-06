import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signIn, 
  signUp, 
  signOut, 
  confirmSignUp, 
  confirmSignIn,
  getCurrentUser, 
  fetchAuthSession,
  fetchUserAttributes
} from 'aws-amplify/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is admin
  const isAdmin = user?.groups?.includes('Admins') || false;
  const isMember = user?.groups?.includes('Members') || false;

  // Get current user from Cognito
  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const attributes = await fetchUserAttributes();
      
      // Extract groups from token
      const groups = session.tokens?.idToken?.payload?.['cognito:groups'] || [];
      
      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        email: attributes.email,
        name: attributes.name || attributes.email,
        groups: Array.isArray(groups) ? groups : [groups]
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.log('No authenticated user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Sign in
  const login = async (email, password) => {
    try {
      const result = await signIn({ 
        username: email, 
        password 
      });
      
      if (result.isSignedIn) {
        await loadUser();
        return { success: true };
      }
      
      return { 
        success: false, 
        nextStep: result.nextStep 
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Sign up
  const register = async (email, password, name) => {
    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name
          }
        }
      });
      
      return { 
        success: true, 
        userId: result.userId,
        nextStep: result.nextStep 
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Confirm sign up
  const confirmRegistration = async (email, code) => {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      return { success: true };
    } catch (error) {
      console.error('Confirmation error:', error);
      throw error;
    }
  };

  // Complete new password challenge
  const completeNewPassword = async (newPassword) => {
    try {
      const result = await confirmSignIn({
        challengeResponse: newPassword
      });
      
      if (result.isSignedIn) {
        await loadUser();
        return { success: true };
      }
      
      return { success: false, nextStep: result.nextStep };
    } catch (error) {
      console.error('Complete new password error:', error);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Get auth token for API calls
  const getToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isMember,
    login,
    register,
    confirmRegistration,
    completeNewPassword,
    logout,
    getToken,
    refreshUser: loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
