(function (window, document) {
  'use strict';

  const client = window.handoverSupabaseClient;
  const isAuthPage = document.body.dataset.page === 'auth';
  let authenticatedUser = null;

  function showServiceError() {
    if (isAuthPage) {
      const shell = document.querySelector('.auth-shell');
      if (shell) shell.hidden = false;
      const message = document.getElementById('auth-message');
      if (message) {
        message.textContent = '인증 서비스를 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
        message.hidden = false;
        message.classList.add('error');
      }
      return;
    }
    const app = document.getElementById('app');
    if (app) {
      app.hidden = false;
      app.innerHTML = '<main class="main"><section class="error-card"><div class="empty-symbol">!</div><h1>인증 서비스에 연결할 수 없습니다</h1><p>인터넷 연결을 확인한 뒤 페이지를 새로고침해 주세요.</p></section></main>';
    }
  }

  function friendlyError(error) {
    const message = String((error && (error.message || error.code)) || '').toLowerCase();
    if (message.includes('invalid login credentials')) return '이메일 또는 비밀번호를 확인해 주세요.';
    if (message.includes('user already registered')) return '이미 가입된 이메일입니다. 로그인해 주세요.';
    if (message.includes('password should be at least') || message.includes('password is too short')) return '비밀번호는 6자 이상 입력해 주세요.';
    if (message.includes('invalid email')) return '올바른 이메일 주소를 입력해 주세요.';
    if (message.includes('email not confirmed')) return '이메일 인증을 완료한 뒤 로그인해 주세요.';
    if (message.includes('rate limit') || message.includes('too many requests')) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    if (message.includes('fetch') || message.includes('network')) return '네트워크 연결을 확인하고 다시 시도해 주세요.';
    return '요청을 처리하지 못했습니다. 입력한 내용을 확인하고 다시 시도해 주세요.';
  }

  function showAuthMessage(text, isError) {
    const message = document.getElementById('auth-message');
    if (!message) return;
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle('error', Boolean(isError));
    message.classList.toggle('success', !isError);
  }

  function setupAuthPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginTab = document.getElementById('show-login');
    const signupTab = document.getElementById('show-signup');
    const setMode = (signup) => {
      loginForm.hidden = signup;
      signupForm.hidden = !signup;
      loginTab.classList.toggle('active', !signup);
      signupTab.classList.toggle('active', signup);
      loginTab.setAttribute('aria-selected', String(!signup));
      signupTab.setAttribute('aria-selected', String(signup));
      document.getElementById('auth-title').textContent = signup ? '회원가입' : '로그인';
      document.querySelector('.auth-card > .subtitle').textContent = signup ? '이메일과 비밀번호로 계정을 만드세요.' : '이메일로 계정에 로그인하세요.';
      const message = document.getElementById('auth-message');
      message.hidden = true;
      message.textContent = '';
    };
    loginTab.addEventListener('click', () => setMode(false));
    signupTab.addEventListener('click', () => setMode(true));

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = loginForm.querySelector('button[type="submit"]');
      const values = new FormData(loginForm);
      button.disabled = true;
      try {
        const { error } = await client.auth.signInWithPassword({
          email: String(values.get('email')).trim(),
          password: String(values.get('password'))
        });
        if (error) throw error;
        window.location.replace('index.html');
      } catch (error) {
        showAuthMessage(friendlyError(error), true);
      } finally {
        button.disabled = false;
      }
    });

    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = signupForm.querySelector('button[type="submit"]');
      const values = new FormData(signupForm);
      button.disabled = true;
      try {
        const { data, error } = await client.auth.signUp({
          email: String(values.get('email')).trim(),
          password: String(values.get('password'))
        });
        if (error) throw error;
        if (data.session) {
          window.location.replace('index.html');
        } else {
          showAuthMessage('가입 요청이 완료되었습니다. 이메일 인증을 마친 뒤 로그인해 주세요.', false);
          setMode(false);
          document.getElementById('login-email').value = String(values.get('email')).trim();
          showAuthMessage('가입 요청이 완료되었습니다. 이메일 인증을 마친 뒤 로그인해 주세요.', false);
        }
      } catch (error) {
        showAuthMessage(friendlyError(error), true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function addLogoutControl(user) {
    if (isAuthPage) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar || topbar.querySelector('#logout-button')) return;
    const control = document.createElement('div');
    control.className = 'auth-control';
    control.innerHTML = '<span class="auth-email"></span><button class="button subtle" id="logout-button" type="button">로그아웃</button>';
    control.querySelector('.auth-email').textContent = user.email || '';
    control.querySelector('#logout-button').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.replace('auth.html');
      } catch (error) {
        button.disabled = false;
        const notice = document.createElement('div');
        notice.className = 'toast';
        notice.setAttribute('role', 'status');
        notice.textContent = '로그아웃하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.';
        document.body.appendChild(notice);
        window.setTimeout(() => notice.remove(), 3000);
      }
    });
    topbar.appendChild(control);
  }

  function addAdminLink(user) {
    const adminId = window.HANDOVER_ADMIN_USER_ID || '';
    const adminEmail = String(window.HANDOVER_ADMIN_EMAIL || '').trim().toLowerCase();
    const isAdmin = (adminId && user.id === adminId) || (adminEmail && String(user.email || '').trim().toLowerCase() === adminEmail);
    if (!isAdmin) return;
    const nav = document.querySelector('.topbar .nav');
    if (!nav || nav.querySelector('[data-admin-link]')) return;
    const link = document.createElement('a');
    link.href = 'admin.html';
    link.textContent = '관리자';
    link.dataset.adminLink = 'true';
    nav.appendChild(link);
  }

  function syncAuthenticatedHeader() {
    if (authenticatedUser) {
      addLogoutControl(authenticatedUser);
      addAdminLink(authenticatedUser);
    }
  }

  if (!client) {
    showServiceError();
    return;
  }

  if (isAuthPage) setupAuthPage();
  if (!isAuthPage && document.body) {
    new MutationObserver(syncAuthenticatedHeader).observe(document.body, { childList: true, subtree: true });
  }
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      authenticatedUser = null;
      if (!isAuthPage) window.location.replace('auth.html');
      return;
    }
    if (event === 'SIGNED_IN' && session && isAuthPage) {
      window.location.replace('index.html');
      return;
    }
    if (session && !isAuthPage) {
      authenticatedUser = session.user;
      syncAuthenticatedHeader();
    }
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    if (isAuthPage) {
      if (data.session) window.location.replace('index.html');
      else {
        const shell = document.querySelector('.auth-shell');
        if (shell) shell.hidden = false;
      }
      return;
    }
    if (!data.session) {
      window.location.replace('auth.html');
      return;
    }
    authenticatedUser = data.session.user;
    syncAuthenticatedHeader();
    const app = document.getElementById('app');
    if (app) app.hidden = false;
  }).catch(() => showServiceError());
})(window, document);
