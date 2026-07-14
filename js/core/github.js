/* github.js
   Pushar den omkrypterade data.js direkt till GitHub via Contents API när
   man byter lösenord, så man slipper kopiera/klistra/committa för hand.
   Token lagras lokalt via Storage - använd en fine-grained PAT begränsad
   till det här repot (Contents: Read and write), inte en klassisk PAT.
*/
const GithubSync = {
  TOKEN_KEY: 'github-pat',
  OWNER: 'DarioSwede',
  REPO: 'FortPolio',
  BRANCH: 'main',
  PATH: 'js/data.js',

  async getToken(){
    const r = await Storage.get(this.TOKEN_KEY);
    return r && r.value ? r.value : '';
  },
  async setToken(token){
    await Storage.set(this.TOKEN_KEY, token || '');
  },

  b64EncodeUnicode(str){
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  },
  b64DecodeUnicode(str){
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  },

  buildEncryptedBlock(blob){
    return `ENCRYPTED_HOLDINGS: { salt:"${blob.salt}", iv:"${blob.iv}", iterations:${blob.iterations}, ct:"${blob.ct}" },`;
  },

  async pushNewBlob(token, blob){
    const api = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.PATH}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };

    const getRes = await fetch(`${api}?ref=${this.BRANCH}`, { headers });
    if(!getRes.ok) throw new Error(`kunde inte hämta data.js (${getRes.status})`);
    const getJson = await getRes.json();
    const currentContent = this.b64DecodeUnicode(getJson.content);

    if(!/ENCRYPTED_HOLDINGS:\s*\{[\s\S]*?\},/.test(currentContent)){
      throw new Error('hittade inte ENCRYPTED_HOLDINGS-blocket i data.js');
    }
    const newContent = currentContent.replace(/ENCRYPTED_HOLDINGS:\s*\{[\s\S]*?\},/, this.buildEncryptedBlock(blob));

    const putRes = await fetch(api, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Byt lösenord (via appen)',
        content: this.b64EncodeUnicode(newContent),
        sha: getJson.sha,
        branch: this.BRANCH
      })
    });
    if(!putRes.ok){
      const errBody = await putRes.json().catch(() => ({}));
      throw new Error(errBody.message || `kunde inte spara (${putRes.status})`);
    }
    return true;
  }
};
