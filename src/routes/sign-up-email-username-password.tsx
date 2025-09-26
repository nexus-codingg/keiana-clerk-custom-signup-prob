import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';

function generateRandomPassword() {
  const characters =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$';
  return Array.from(crypto.getRandomValues(new Uint32Array(12)))
    .map((x) => characters[x % characters.length])
    .join('');
}

const verificationSchema = z.object({
  code: z.string().length(6, 'Code must be 6 characters'),
});

export type VerificationSchema = z.infer<typeof verificationSchema>;

export function useVerificationForm() {
  return useForm<VerificationSchema>({
    resolver: zodResolver(verificationSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
}

export function useClerkSignupWithEmail() {
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { isLoaded, signUp, setActive } = useSignUp();

  async function signup(data: FormSchemaWithEmail) {
    if (!isLoaded || !signUp) {
      return { success: false, error: 'Clerk not loaded' };
    }

    setIsCreating(true);

    try {
      // Create the signup
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        username: data.username,
      });

      // Prepare email verification if signup is not complete
      if (result.status === 'missing_requirements') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        return { success: true, requiresVerification: true };
      }

      // If signup is complete, set the session as active
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return { success: true, requiresVerification: false };
      }

      return { success: false, error: 'Unexpected signup status' };
    } catch (err: any) {
      console.error('Signup error:', err);
      return { 
        success: false, 
        error: err?.errors?.[0]?.longMessage || err?.message || 'Signup failed' 
      };
    } finally {
      setIsCreating(false);
    }
  }

  async function verify(code: string) {
    if (!isLoaded || !signUp) {
      return { success: false, error: 'Clerk not loaded' };
    }

    setIsVerifying(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return { success: true };
      }

      return { success: false, error: 'Verification failed' };
    } catch (err: any) {
      console.error('Verification error:', err);
      return { 
        success: false, 
        error: err?.errors?.[0]?.longMessage || err?.message || 'Verification failed' 
      };
    } finally {
      setIsVerifying(false);
    }
  }

  return { 
    signup, 
    verify, 
    isCreating, 
    isVerifying,
    isLoaded 
  };
}

export const passwordRequirementSchemas = {
  charLength: z.string().min(8).max(12),
  oneLowercase: z.string().regex(/[a-z]/, 'Must contain lowercase letter'),
  oneUppercase: z.string().regex(/[A-Z]/, 'Must contain uppercase letter'),
  oneNumber: z.string().regex(/\d/, 'Must contain number'),
  oneSpecial: z
    .string()
    .regex(/[!@#$%^&*(),.?":{}|<>\-_[\]]/, 'Must contain special character'),
};

const passwordSchema = z
  .string()
  .pipe(passwordRequirementSchemas.charLength)
  .pipe(passwordRequirementSchemas.oneLowercase)
  .pipe(passwordRequirementSchemas.oneUppercase)
  .pipe(passwordRequirementSchemas.oneNumber)
  .pipe(passwordRequirementSchemas.oneSpecial);

const formSchemaWithEmail = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    username: z.string().min(4, 'Username must be at least 4 characters'),
    password: passwordSchema,
    confirmPassword: z.string(),
    tos: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.tos, {
    message: 'You must accept the terms of service',
    path: ['tos'],
  });

export type FormSchemaWithEmail = z.infer<typeof formSchemaWithEmail>;

export function useSignupFormWithEmail() {
  const pwd = generateRandomPassword();

  return useForm<FormSchemaWithEmail>({
    resolver: zodResolver(formSchemaWithEmail),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: 'test@example.com',
      username: 'testingUser',
      password: pwd,
      confirmPassword: pwd,
      tos: false,
    },
  });
}

type SIGNUP_STATE = 'LOADING' | 'ERROR' | 'VERIFY_EMAIL' | 'READY' | 'DONE';

export default function SignupEmailUsernamePassword() {
  const [state, setState] = useState<SIGNUP_STATE>('READY');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const signupForm = useSignupFormWithEmail();
  const verifyForm = useVerificationForm();
  const { signup, verify, isCreating, isVerifying, isLoaded } = useClerkSignupWithEmail();

  async function onSignup(data: FormSchemaWithEmail) {
    setError(null);
    const result = await signup(data);

    if (result.success) {
      if (result.requiresVerification) {
        setState('VERIFY_EMAIL');
      } else {
        setState('DONE');
      }
    } else {
      setError(result.error);
      setState('ERROR');
    }
  }

  async function onVerification(data: VerificationSchema) {
    setError(null);
    const result = await verify(data.code);

    if (result.success) {
      setState('DONE');
    } else {
      setError(result.error);
      setState('ERROR');
    }
  }

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: '#007bff', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <div>Loading Clerk...</div>
      </div>
    );
  }

  if (state === 'READY') {
    return (
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: '#007bff', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <h1>Sign Up with Email, Username & Password</h1>
        <form onSubmit={signupForm.handleSubmit(onSignup)}>
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              {...signupForm.register('email')} 
            />
            {signupForm.formState.errors.email && (
              <p style={{ color: 'red' }}>
                {signupForm.formState.errors.email.message}
              </p>
            )}
          </div>
          
          <div>
            <input 
              placeholder="Username" 
              {...signupForm.register('username')} 
            />
            {signupForm.formState.errors.username && (
              <p style={{ color: 'red' }}>
                {signupForm.formState.errors.username.message}
              </p>
            )}
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Password" 
                {...signupForm.register('password')} 
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '12px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {signupForm.formState.errors.password && (
              <p style={{ color: 'red' }}>
                {signupForm.formState.errors.password.message}
              </p>
            )}
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password" 
                {...signupForm.register('confirmPassword')} 
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '12px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {signupForm.formState.errors.confirmPassword && (
              <p style={{ color: 'red' }}>
                {signupForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          
          <div>
            <label>
              <input 
                type="checkbox" 
                {...signupForm.register('tos')} 
              />
              I accept the terms of service
            </label>
            {signupForm.formState.errors.tos && (
              <p style={{ color: 'red' }}>
                {signupForm.formState.errors.tos.message}
              </p>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={!signupForm.formState.isValid || isCreating}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            {isCreating ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
      </div>
    );
  }

  if (state === 'VERIFY_EMAIL') {
    return (
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: '#007bff', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <h1>Verify Your Email</h1>
        <p>Please enter the 6-digit code sent to your email address.</p>
        <form onSubmit={verifyForm.handleSubmit(onVerification)}>
          <div>
            <input 
              placeholder="Verification Code"
              {...verifyForm.register('code')} 
            />
            {verifyForm.formState.errors.code && (
              <p style={{ color: 'red' }}>
                {verifyForm.formState.errors.code.message}
              </p>
            )}
          </div>
          <button 
            type="submit" 
            disabled={isVerifying}
            style={{ opacity: isVerifying ? 0.6 : 1 }}
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
      </div>
    );
  }

  if (state === 'DONE') {
    return (
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: '#007bff', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <h1>Welcome!</h1>
        <p>You have successfully signed up and verified your email address.</p>
      </div>
    );
  }

  if (state === 'ERROR') {
    return (
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: '#007bff', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <h1>Error</h1>
        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <p style={{ color: '#c33', margin: 0 }}>{error}</p>
          </div>
        )}
        <button 
          onClick={() => {
            setState('READY');
            setError(null);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return <div>Loading...</div>;
}