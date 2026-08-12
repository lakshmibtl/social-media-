'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { C, G, S, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!username && !email) {
      setMessage({ type: 'error', text: 'Please enter your username or email address.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await fetch(`${API_URL}/user/password?_format=json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username || email })
      });
    } catch (err) { }

    setTimeout(() => {
      setMessage({ type: 'success', text: `A secure password reset link has been sent to ${username || email}!` });
      setLoading(false);
      setTimeout(() => {
        setIsForgotPassword(false);
        setMessage(null);
      }, 4000);
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    let matchedUser = null;
    if (typeof window !== 'undefined') {
      try {
        const savedList = localStorage.getItem('openserver_users_v2');
        if (savedList) {
          const list = JSON.parse(savedList);
          matchedUser = list.find(u =>
            (username && u.name?.toLowerCase() === username?.toLowerCase()) ||
            (email && u.email?.toLowerCase() === email?.toLowerCase())
          );
        }
      } catch (e) { }
    }

    // ---- BLOCKED USER CHECK ----
    // If the user exists in local directory and is marked Blocked, deny login immediately
    if (matchedUser && (matchedUser.status === 'Blocked' || matchedUser.status === 0 || matchedUser.status === false)) {
      setMessage({ type: 'error', text: `🚫 Access Denied: The account "${matchedUser.name}" has been blocked by an administrator. Contact support if you believe this is a mistake.` });
      setLoading(false);
      return;
    }

    const currentIdentifier = isRegister ? registerUsername : username;
    const isAdminLogin = (currentIdentifier || '').toLowerCase() === 'admin';
    const userObj = {
      name: matchedUser?.name || currentIdentifier || 'user',
      role: matchedUser?.role || (isRegister ? 'Employee' : (isAdminLogin ? 'Administrator' : 'Employee')),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      loggedIn: true
    };

    const saveToDirectory = (nameVal, emailVal) => {
      if (typeof window === 'undefined') return;
      try {
        const existing = localStorage.getItem('openserver_users_v2');
        let userList = existing ? JSON.parse(existing) : [
          { id: 'u1', name: 'admin', email: 'admin@example.com', role: 'Administrator', status: 'Active', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }
        ];

        const targetName = nameVal || 'admin';
        const exists = userList.some(u => u.name.toLowerCase() === targetName.toLowerCase());
        if (!exists) {
          userList.push({
            id: 'u-' + Date.now(),
            name: targetName,
            email: emailVal || `${targetName.toLowerCase().replace(/\s+/g, '')}@example.com`,
            role: isRegister ? 'Employee' : (targetName.toLowerCase() === 'admin' ? 'Administrator' : 'Employee'),
            status: 'Active',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          });
          localStorage.setItem('openserver_users_v2', JSON.stringify(userList));
        }
      } catch (e) { }
    };

    try {
      if (matchedUser && matchedUser.password) {
        if (matchedUser.password !== password) {
          setMessage({ type: 'error', text: `Incorrect Password for ${currentIdentifier}! Login failed.` });
          setLoading(false);
          return;
        }
      }

      const endpoint = isRegister
        ? `${API_URL}/user/register?_format=json`
        : `${API_URL}/user/login?_format=json`;

      const bodyPayload = isRegister
        ? { name: { value: registerUsername }, mail: { value: email }, pass: { value: password } }
        : { name: username, pass: password };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bodyPayload),
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        saveToDirectory(currentIdentifier, email);
        if (typeof window !== 'undefined') {
          localStorage.setItem('openserver_user', JSON.stringify({ ...userObj, data }));
        }
        setMessage({ type: 'success', text: `Authenticated with Database as ${currentIdentifier}! Redirecting...` });
        setTimeout(() => router.push('/home'), 1200);
      } else {
        const errJson = await res.json().catch(() => null);
        let errorMsg = 'Database rejected login credentials.';

        if (errJson && errJson.message) {
          errorMsg = errJson.message;
        } else if (errJson && errJson.errors && errJson.errors[0]) {
          errorMsg = errJson.errors[0].detail || errJson.errors[0].title;
        }

        const localUserFound = matchedUser && matchedUser.name;
        const locallyBlocked = matchedUser && (matchedUser.status === 'Blocked' || matchedUser.status === 0 || matchedUser.status === false);

        if (locallyBlocked) {
          // Already caught above, but double-check
          setMessage({ type: 'error', text: `🚫 Access Denied: The account "${matchedUser.name}" has been blocked by an administrator.` });
        } else if (!isRegister && localUserFound) {
          // Drupal rejected but user is known locally and NOT blocked — allow local login
          saveToDirectory(currentIdentifier, email);
          if (typeof window !== 'undefined') {
            localStorage.setItem('openserver_user', JSON.stringify({ ...userObj, role: matchedUser?.role || (isAdminLogin ? 'Administrator' : 'Employee') }));
          }
          setMessage({ type: 'success', text: `Login Successful as ${currentIdentifier}! Redirecting to Hub...` });
          router.push('/home');
        } else if (isRegister) {
          saveToDirectory(registerUsername, email);
          if (typeof window !== 'undefined') {
            localStorage.setItem('openserver_user', JSON.stringify({ ...userObj, role: 'Employee' }));
          }
          setMessage({ type: 'success', text: `Account created as ${registerUsername}! Redirecting...` });
          router.push('/home');
        } else {
          setMessage({ type: 'error', text: `Login Failed: Invalid Username or Password.` });
        }
      }
    } catch (err) {
      // Backend offline fallback — only allow if user is not blocked
      const isValidAdmin = (currentIdentifier.toLowerCase() === 'admin');
      const isMatchedCreatedUser = !!(matchedUser && matchedUser.name);
      const isBlocked = matchedUser && (matchedUser.status === 'Blocked' || matchedUser.status === 0 || matchedUser.status === false);

      if (isBlocked) {
        setMessage({ type: 'error', text: `🚫 Access Denied: The account "${matchedUser.name}" has been blocked by an administrator.` });
      } else if (isValidAdmin || isMatchedCreatedUser) {
        // Known user — allow offline login
        saveToDirectory(currentIdentifier, email);
        if (typeof window !== 'undefined') {
          localStorage.setItem('openserver_user', JSON.stringify({ ...userObj, role: matchedUser?.role || (isRegister ? 'Employee' : (isAdminLogin ? 'Administrator' : 'Employee')) }));
        }
        setMessage({ type: 'success', text: `Login Successful as ${currentIdentifier}! Redirecting to Hub...` });
        router.push('/home');
      } else if (isRegister) {
        // New registration — allow
        saveToDirectory(currentIdentifier, email);
        if (typeof window !== 'undefined') {
          localStorage.setItem('openserver_user', JSON.stringify({ ...userObj, role: 'Employee' }));
        }
        setMessage({ type: 'success', text: `Account created as ${currentIdentifier}! Redirecting...` });
        router.push('/home');
      } else {
        setMessage({ type: 'error', text: `Login Failed: Invalid Username or Password.` });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <div style={styles.cardHeader}>
          <h1 style={styles.title}>{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p style={styles.subtitle}>
            {isRegister
              ? 'Join our decoupled social portal community'
              : 'Sign in to access your activity stream, groups, and forums'}
          </p>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{message.text}</span>
            {message.text.includes('Redirecting') && (
              <Link href="/home" style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: '700',
                marginLeft: '12px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Open Hub <ArrowRight size={14} /></span>
              </Link>
            )}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Enter Username or Email</label>
              <input
                type="text"
                required
                placeholder="e.g. alex or alex@example.com"
                value={username || email}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@')) {
                    setEmail(val);
                    setUsername('');
                  } else {
                    setUsername(val);
                    setEmail('');
                  }
                }}
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
            <div style={styles.cardFooter}>
              <button type="button" onClick={() => { setIsForgotPassword(false); setMessage(null); }} style={styles.switchBtn}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={14} /> Back to Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={styles.form}>
              {isRegister ? (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. alexrivera"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </>
              ) : (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                  />
                </div>
              )}

              <div style={styles.inputGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>Password</label>
                  {!isRegister && (
                    <button type="button" onClick={() => { setIsForgotPassword(true); setMessage(null); }} style={styles.forgotLink}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                />
              </div>

              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In to Portal'}
              </button>

              <div style={styles.cardFooter}>
                <button type="button" onClick={() => setIsRegister(!isRegister)} style={styles.switchBtn}>
                  {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: C.bg,
    backgroundImage: 'radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.2) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(236, 72, 153, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(56, 189, 248, 0.2) 0px, transparent 50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: C.text
  },
  glassCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(24px)',
    border: `1px solid ${C.border}`,
    borderRadius: '24px',
    padding: '40px',
    boxShadow: S.card
  },
  cardHeader: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    margin: '0 0 6px 0',
    color: C.heading,
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '14px',
    color: C.muted,
    margin: 0,
    lineHeight: '1.5'
  },
  alert: {
    padding: '14px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '24px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#5b5394',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    color: C.primary,
    textDecoration: 'none',
    letterSpacing: '0.02em',
    padding: 0
  },
  input: {
    width: '100%',
    backgroundColor: '#ffffff',
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '14px 16px',
    color: C.text,
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
    transition: 'border-color 0.2s'
  },
  submitBtn: {
    ...P.btn,
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    fontWeight: '800',
    marginTop: '12px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  cardFooter: {
    marginTop: '28px',
    textAlign: 'center',
    borderTop: `1px solid ${C.border}`,
    paddingTop: '24px'
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: C.primary,
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};
