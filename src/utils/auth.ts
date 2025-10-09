export const validatePassword = (password: string): { error: string | null } => {
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }
  if (!/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?:[^\s])+$/.test(password)) {
    return { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.' };
  }
  return { error: null };
};

export const validateEmail = (email: string): { error: string | null } => {
  if (!/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_'+\-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/.test(email)) {
    return { error: 'Invalid email address.' };
  }
  return { error: null };
};
