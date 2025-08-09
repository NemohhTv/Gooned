
// Netlify rebuild (debounced) after save
let __rebuildTimer;
async function __triggerSiteRebuild() {
  try {
    await fetch('/.netlify/functions/trigger-build', { method: 'POST' });
    console.log('[Netlify] rebuild triggered');
  } catch (e) {
    console.error('[Netlify] rebuild failed', e);
  }
}
function __queueRebuild() {
  clearTimeout(__rebuildTimer);
  __rebuildTimer = setTimeout(__triggerSiteRebuild, 1200);
}

// admin_gate.js — UI gate between login and admin app
(()=>{
  const loginPanel = document.getElementById('loginPanel');
  const adminApp = document.getElementById('adminApp');
  const adminPassword = document.getElementById('adminPassword');
  const rememberMe = document.getElementById('rememberMe');
  const loginBtn = document.getElementById('loginBtn');
  const createAdminBtn = document.getElementById('createAdminBtn');
  const changePassBtn = document.getElementById('changePassBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginHelp = document.getElementById('loginHelp');

  function showLogin(msg){
    if (adminApp) adminApp.style.display = 'none';
    if (loginPanel) loginPanel.style.display = '';
    if (msg && loginHelp) loginHelp.textContent = msg;
    console.log('[admin_gate] state=login', msg||'');
  }

  function showApp(){
    if (loginPanel) loginPanel.style.display = 'none';
    if (adminApp) adminApp.style.display = '';
    console.log('[admin_gate] state=app');
  }

  async function init(){
    try {
      const hasPass = !!localStorage.getItem(window.GOONED_AUTH.PASS_KEY);
      if (hasPass){
        if (window.GOONED_AUTH.hasActiveSession()) showApp();
        else showLogin('Please login to continue.');
      } else {
        showLogin('No admin exists yet. Create one below.');
      }
    } catch (e) {
      console.error('[admin_gate] init error', e);
      showLogin('Error initializing. Check console.');
    }
  }

  loginBtn?.addEventListener('click', async ()=>{
    const ok = await window.GOONED_AUTH.verifyPassword(adminPassword.value.trim());
    if (ok){
      window.GOONED_AUTH.setSession(!!rememberMe.checked);
      showApp();
      adminPassword.value = '';
    } else {
      showLogin('Incorrect password. Try again.');
    }
  });

  createAdminBtn?.addEventListener('click', async ()=>{
    const hasPass = !!localStorage.getItem(window.GOONED_AUTH.PASS_KEY);
    if (hasPass){ showLogin('An admin already exists. Please log in.'); return; }
    const newPass = adminPassword.value.trim();
    if (!newPass){ showLogin('Enter a password first.'); return; }
    await window.GOONED_AUTH.setPassword(newPass);
    window.GOONED_AUTH.setSession(!!rememberMe.checked);
    showApp();
    alert('Admin created and logged in.');
    adminPassword.value = '';
  });

  changePassBtn?.addEventListener('click', async ()=>{
    const cur = prompt('Enter current password:');
    if (!cur) return;
    const ok = await window.GOONED_AUTH.verifyPassword(cur);
    if (!ok){ alert('Current password incorrect.'); return; }
    const next = prompt('Enter new password:');
    if (!next){ alert('Canceled.'); return; }
    await window.GOONED_AUTH.setPassword(next);
    alert('Password changed.');
  });

  logoutBtn?.addEventListener('click', ()=>{
    window.GOONED_AUTH.clearSession();
    showLogin('You have been logged out.');
  });

  init();
})();
