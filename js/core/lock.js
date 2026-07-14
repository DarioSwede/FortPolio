/* lock.js - lösenordsskärm + "byt lösenord" (krypterar om lokalt) */
const Lock = {
  REMEMBER_KEY: 'remembered-pw',

  async init(){
    document.getElementById('lockInput').addEventListener('keydown', e => {
      if(e.key === 'Enter') this.tryUnlock();
    });

    const saved = await Storage.get(this.REMEMBER_KEY);
    if(saved && saved.value){
      document.getElementById('rememberMe').checked = true;
      await this.tryUnlock(saved.value, true);
    }
  },

  async tryUnlock(passwordOverride, isAutoAttempt){
    const val = passwordOverride !== undefined ? passwordOverride : document.getElementById('lockInput').value;
    const btn = document.getElementById('unlockBtn');
    const errEl = document.getElementById('lockError');
    btn.disabled = true; errEl.textContent = '';
    try{
      const data = await Crypto.decrypt(val, DATA.ENCRYPTED_HOLDINGS);
      State.STOCKS = data.STOCKS;
      State.FUNDS = data.FUNDS;
      State.assignIds();
      document.getElementById('lockScreen').classList.add('hidden');
      const remember = document.getElementById('rememberMe').checked;
      await Storage.set(this.REMEMBER_KEY, remember ? val : '');
      App.start();
    }catch(e){
      await Storage.set(this.REMEMBER_KEY, '');
      if(!isAutoAttempt) errEl.textContent = 'Fel lösenord';
    }
    btn.disabled = false;
  },

  async relock(){
    await Storage.set(this.REMEMBER_KEY, '');
    State.STOCKS = [];
    State.FUNDS = [];
    document.getElementById('lockInput').value = '';
    document.getElementById('rememberMe').checked = false;
    document.getElementById('lockError').textContent = '';
    document.getElementById('lockScreen').classList.remove('hidden');
  },

  async openRekrypt(){
    document.getElementById('rekryptScreen').classList.remove('hidden');
    document.getElementById('newPass1').value = '';
    document.getElementById('newPass2').value = '';
    document.getElementById('rekryptError').textContent = '';
    document.getElementById('rekryptStatus').textContent = '';
    document.getElementById('rekryptOutput').style.display = 'none';
    document.getElementById('copyRekryptBtn').style.display = 'none';
    const savedToken = await GithubSync.getToken();
    document.getElementById('githubToken').value = savedToken;
    document.getElementById('rememberToken').checked = !!savedToken;
  },
  closeRekrypt(){ document.getElementById('rekryptScreen').classList.add('hidden'); },

  async doRekrypt(){
    const p1 = document.getElementById('newPass1').value;
    const p2 = document.getElementById('newPass2').value;
    const tokenInput = document.getElementById('githubToken').value.trim();
    const rememberToken = document.getElementById('rememberToken').checked;
    const errEl = document.getElementById('rekryptError');
    const statusEl = document.getElementById('rekryptStatus');
    const btn = document.getElementById('rekryptBtn');
    const outEl = document.getElementById('rekryptOutput');
    const copyBtn = document.getElementById('copyRekryptBtn');
    errEl.textContent = ''; statusEl.textContent = '';
    outEl.style.display = 'none'; copyBtn.style.display = 'none';

    if(!p1 || p1.length < 4){ errEl.textContent = 'Minst 4 tecken.'; return; }
    if(p1 !== p2){ errEl.textContent = 'Lösenorden matchar inte.'; return; }

    const blob = await Crypto.encrypt(p1, { STOCKS: State.STOCKS, FUNDS: State.FUNDS });
    const showManualFallback = () => {
      outEl.value = GithubSync.buildEncryptedBlock(blob);
      outEl.style.display = 'block';
      copyBtn.style.display = 'inline-block';
      outEl.select();
    };

    const token = tokenInput || await GithubSync.getToken();
    if(!token){
      errEl.textContent = 'Ingen GitHub-token angiven - klistra in koden nedan manuellt i js/data.js istället.';
      showManualFallback();
      // det gamla lösenordet slutar fungera så fort den nya blobben klistras in i data.js
      await Storage.set(this.REMEMBER_KEY, '');
      return;
    }

    btn.disabled = true; btn.textContent = 'Sparar till GitHub …';
    try{
      await GithubSync.pushNewBlob(token, blob);
      await GithubSync.setToken(rememberToken ? token : '');
      await Storage.set(this.REMEMBER_KEY, '');
      statusEl.textContent = `✓ Sparat till GitHub (${GithubSync.OWNER}/${GithubSync.REPO}@${GithubSync.BRANCH}).`;
    }catch(e){
      errEl.textContent = `Kunde inte spara automatiskt (${e.message}). Kopiera koden nedan och klistra in i js/data.js istället.`;
      showManualFallback();
      await Storage.set(this.REMEMBER_KEY, '');
    }
    btn.disabled = false; btn.textContent = 'Kryptera om och spara';
  }
};
