
// auth.js — simple localStorage-based admin auth
(()=>{
  const PASS_KEY = 'GOONED_ADMIN_PASSWORD';      // stores hex SHA-256 hash
  const PERSIST_TOKEN_KEY = 'GOONED_ADMIN_SESSION_PERSIST'; // persistent session token
  const SESSION_TOKEN_KEY = 'GOONED_ADMIN_SESSION';         // sessionStorage token

  async function sha256Hex(str){
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2, '0')).join('');
  }

  function genToken(){ return (crypto.getRandomValues(new Uint32Array(4))).join('-'); }

  function setSession(persistent){
    const token = genToken();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    if (persistent){
      localStorage.setItem(PERSIST_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(PERSIST_TOKEN_KEY);
    }
    return token;
  }

  function clearSession(){
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(PERSIST_TOKEN_KEY);
  }


  const SETUP_KEY_HASH = "3d5674bc82ae40f503166a87df0ded400817347ac0024746ff77ca7e07e5e817"; // SHA-256 of the setup key

  async function verifySetupKey(key){
    const hash = await sha256Hex(key);
    return hash === SETUP_KEY_HASH;
  }

  function hasActiveSession(){
    const s = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const p = localStorage.getItem(PERSIST_TOKEN_KEY);
    // valid if there's a session token OR a persisted token
    return Boolean(s || p);
  }

  async function setPassword(newPass){
    const hash = await sha256Hex(newPass);
    localStorage.setItem(PASS_KEY, hash);
  }

  async function verifyPassword(pass){
    const stored = localStorage.getItem(PASS_KEY);
    if (!stored) return false;
    const hash = await sha256Hex(pass);
    return hash === stored;
  }

  // Expose
  window.GOONED_AUTH = {
    setPassword,
    verifyPassword,
    setSession,
    clearSession,
    hasActiveSession,
    verifySetupKey,
    PASS_KEY, PERSIST_TOKEN_KEY, SESSION_TOKEN_KEY
  };
})();
