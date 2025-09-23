import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

export function useClerkSignup() {
  const [state, setState] = useState<
    'idle' | 'loading' | 'error' | 'success' | 'verify'
  >('idle');
  const { isLoaded, signUp } = useSignUp();

  async function signup(data: FormSchema, email: string) {
    if (!isLoaded) {
      return;
    }

    setState('loading');

    try {
      await signUp.create({
        emailAddress: email,
        password: data.password,
        username: data.username,
      });

      const result = await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setState('verify');

      return result.status;
    } catch (err: unknown) {
      console.error('ERROR', JSON.stringify(err, null, 2));
      setState('error');
      return;
    }
  }

  async function verify(code: string) {
    if (!isLoaded) {
      return;
    }

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      return result.status;
    } catch (err: unknown) {
      setState('error');
      return;
    }
  }

  return { state, signup, verify };
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
const formSchema = z
  .object({
    username: z.string().min(4),
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
export type FormSchema = z.infer<typeof formSchema>;

export function useSignupForm() {
  const pwd = generateRandomPassword();

  return useForm<FormSchema>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      username: 'testingUser',
      password: pwd,
      confirmPassword: pwd,
    },
  });
}

type SIGNUP_STATE = 'LOADING' | 'ERROR' | 'VERIFY_EMAIL' | 'READY' | 'DONE';

export default function Signup() {
  const [state, setState] = useState<SIGNUP_STATE>('READY');
  const [err, setErr] = useState<unknown>();
  const email = 'tomek.buszewski+clerk_test@gmail.com'; // normally email comes from another hooka and is always available

  const signupForm = useSignupForm();
  const verifyForm = useVerificationForm();
  const { signup, verify } = useClerkSignup();

  async function onSignup(data: FormSchema) {
    const result = await signup(data, email as string);

    if (result === 'complete') {
      setState('VERIFY_EMAIL');
    } else {
      console.log('SIGNUP', result);
      setErr(result);
      setState('ERROR');
    }
  }

  async function onVerification(data: VerificationSchema) {
    const result = await verify(data.code);

    if (result === 'complete') {
      setState('DONE');
    } else {
      console.log('VERIFICATION', result);
      setState('ERROR');
    }
  }

  if (state === 'READY') {
    return (
      <form onSubmit={signupForm.handleSubmit(onSignup)}>
        <input placeholder="username" {...signupForm.register('username')} />
        <input placeholder="password" {...signupForm.register('password')} />
        <input
          placeholder="repeat password"
          {...signupForm.register('confirmPassword')}
        />
        <button type="submit">Submit</button>
      </form>
    );
  }

  if (state === 'VERIFY_EMAIL') {
    return (
      <form onSubmit={verifyForm.handleSubmit(onVerification)}>
        <input {...verifyForm.register('code')} />
        <button type="submit">Submit</button>
      </form>
    );
  }

  if (state === 'DONE') {
    return <div>Signed up successfully</div>;
  }

  if (state === 'ERROR') {
    return <pre>{JSON.stringify(err, null, 2)}</pre>;
  }

  return <div>Loading...</div>;
}
