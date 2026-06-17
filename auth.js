const DearelleAuth = (() => {
  const supabaseUrl = "https://mojlrlotoqtspblzjlnj.supabase.co";
  const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vamxybG90b3F0c3BibHpqbG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDMyMTAsImV4cCI6MjA5NzI3OTIxMH0.GpAkDtW2CIVUX9EyeuL0Znogg88P5iW4WqLe6_ZgWps";
  const sessionKey = "dearelleCustomerSession";

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(sessionKey) || "null");
    } catch {
      localStorage.removeItem(sessionKey);
      return null;
    }
  }

  function saveSession(session) {
    if (!session?.access_token) return null;
    localStorage.setItem(sessionKey, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(sessionKey);
  }

  async function supabase(path, options = {}) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error_description || payload.msg || payload.message || "Supabase request failed");
    return payload;
  }

  async function signUp({ email, password, firstName, lastName, phone }) {
    const payload = await supabase("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { firstName, lastName, phone }
      })
    });
    if (payload.access_token) saveSession(payload);
    return payload;
  }

  async function signIn({ email, password }) {
    return saveSession(await supabase("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }));
  }

  async function signOut() {
    const session = getSession();
    if (session?.access_token) {
      await supabase("/auth/v1/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).catch(() => null);
    }
    clearSession();
  }

  async function currentUser() {
    const session = getSession();
    if (!session?.access_token) return null;
    const user = await supabase("/auth/v1/user", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    saveSession({ ...session, user });
    return user;
  }

  async function rest(path, options = {}) {
    const session = getSession();
    if (!session?.access_token) throw new Error("Please sign in first.");
    return supabase(`/rest/v1/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {})
      }
    });
  }

  return {
    clearSession,
    currentUser,
    getSession,
    rest,
    signIn,
    signOut,
    signUp,
    supabaseUrl,
    supabaseAnonKey
  };
})();

window.DearelleAuth = DearelleAuth;
