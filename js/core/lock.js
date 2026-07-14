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

  openRekrypt(){
    document.getElementById('rekryptScreen').classList.remove('hidden');
    document.getElementById('newPass1').value = '';
    document.getElementById('newPass2').value = '';
    document.getElementById('rekryptError').textContent = '';
    document.getElementById('rekryptOutput').style.display = 'none';
  },
  closeRekrypt(){ document.getElementById('rekryptScreen').classList.add('hidden'); },

  async doRekrypt(){
    const p1 = document.getElementById('newPass1').value;
    const p2 = document.getElementById('newPass2').value;
    const errEl = document.getElementById('rekryptError');
    if(!p1 || p1.length < 4){ errEl.textContent = 'Minst 4 tecken.'; return; }
    if(p1 !== p2){ errEl.textContent = 'Lösenorden matchar inte.'; return; }
    errEl.textContent = '';

    const blob = await Crypto.encrypt(p1, { STOCKS: State.STOCKS, FUNDS: State.FUNDS });
    const out = `ENCRYPTED_HOLDINGS: { salt:"${blob.salt}", iv:"${blob.iv}", iterations:${blob.iterations}, ct:"${blob.ct}" },`;
    const outEl = document.getElementById('rekryptOutput');
    outEl.value = out;
    outEl.style.display = 'block';
    outEl.select();
    // det gamla lösenordet slutar fungera så fort den nya blobben klistras in i data.js
    await Storage.set(this.REMEMBER_KEY, '');
  }
};
