import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import Button from './Button';
import Input from './Input';
import Label from './Label';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from './Card';

export const SignInForm = ({ onSuccess, onSwitchToSignUp }) => {
  const { signInWithPassword, signInLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!email || !password) {
      setMessage('Please enter both email and password');
      setMessageType('error');
      return;
    }

    const result = await signInWithPassword(email, password);
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('success');
      if (onSuccess) onSuccess();
    } else {
      setMessage(result.error);
      setMessageType('error');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your email and password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={signInLoading}
          >
            {signInLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          {message && (
            <p className={`text-sm text-center ${
              messageType === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {message}
            </p>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const SignUpForm = ({ onSuccess, onSwitchToSignIn }) => {
  const { signUpWithPassword, signUpLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!email || !password || !confirmPassword) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    const result = await signUpWithPassword(email, password);
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('success');
      if (onSuccess) onSuccess();
    } else {
      setMessage(result.error);
      setMessageType('error');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="mt-1"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={signUpLoading}
          >
            {signUpLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {message && (
            <p className={`text-sm text-center ${
              messageType === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {message}
            </p>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const AuthPage = () => {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Fleet Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignIn ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {isSignIn ? (
          <SignInForm onSwitchToSignUp={() => setIsSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setIsSignIn(true)} />
        )}
      </div>
    </div>
  );
}; 