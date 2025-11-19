import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { RegisterDTO, LoginDTO, GoogleLoginDTO, User } from '../types';
import { generateToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  // Register new user
  async register(data: RegisterDTO): Promise<{ user: User; token: string }> {
    const { email, phone, password, confirmPassword, first_name, last_name, date_of_birth, job } = data;

    // Validate password match
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email}${phone ? `,phone.eq.${phone}` : ''}`)
      .single();

    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        phone,
        password_hash,
        first_name,
        last_name,
        date_of_birth,
        job,
        auth_provider: 'credential',
      })
      .select()
      .single();

    if (error || !newUser) {
      throw new Error('Failed to create user');
    }

    // Generate token
    const token = generateToken({ id: newUser.id, email: newUser.email });

    return { user: newUser, token };
  }

  // Login with credentials
  async login(data: LoginDTO): Promise<{ user: User; token: string }> {
    const { emailOrPhone, password, rememberMe } = data;

    // Find user by email or phone
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    if (!user.password_hash) {
      throw new Error('Please use Google login for this account');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    return { user, token };
  }

  // Google OAuth login
  async googleLogin(data: GoogleLoginDTO): Promise<{ user: User; token: string; isNewUser: boolean }> {
    const { token } = data;

    try {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token');
      }

      const { sub: google_id, email, given_name, family_name, picture } = payload;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', google_id)
        .single();

      let user: User;
      let isNewUser = false;

      if (existingUser) {
        user = existingUser;
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            email,
            google_id,
            first_name: given_name || 'User',
            last_name: family_name || '',
            avatar_url: picture,
            auth_provider: 'google',
            is_verified: true,
          })
          .select()
          .single();

        if (error || !newUser) {
          throw new Error('Failed to create user');
        }

        user = newUser;
        isNewUser = true;
      }

      // Generate JWT token
      const jwtToken = generateToken({ id: user.id, email: user.email });

      return { user, token: jwtToken, isNewUser };
    } catch (error: any) {
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    return user;
  }
}

