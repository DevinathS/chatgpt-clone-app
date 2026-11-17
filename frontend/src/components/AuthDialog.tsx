import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Link, TextField, Typography } from '@mui/material';
import { useEffect, useState, type FormEvent } from 'react';
import { clearAuthError, login, register } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openAuth } from '../store/uiSlice';

export default function AuthDialog() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.ui.authDialog);
  const { status, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    dispatch(clearAuthError());
  }, [mode, dispatch]);

  const signup = mode === 'signup';
  const loading = status === 'loading';

  const close = () => {
    dispatch(openAuth(null));
    setPassword('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const action = signup
      ? register({ email, password, display_name: name.trim() })
      : login({ email, password });
    const result = await dispatch(action);
    if (result.meta.requestStatus === 'fulfilled') {
      close();
      setEmail('');
      setName('');
    }
  };

  return (
    <Dialog open={mode !== null} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ textAlign: 'center', pt: 4, fontWeight: 600 }}>
        {signup ? 'Create your account' : 'Welcome back'}
      </DialogTitle>
      <DialogContent sx={{ px: 4, pb: 4 }}>
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {signup && (
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              autoComplete="name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          )}
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={!signup}
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={signup ? 'new-password' : 'current-password'}
            helperText={signup ? 'At least 8 characters' : undefined}
            slotProps={{ htmlInput: { minLength: signup ? 8 : undefined, maxLength: 128 } }}
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.4 }}>
            {loading ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {signup ? 'Already have an account? ' : "Don't have an account? "}
            <Link component="button" type="button" underline="always" onClick={() => dispatch(openAuth(signup ? 'login' : 'signup'))}>
              {signup ? 'Log in' : 'Sign up'}
            </Link>
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
