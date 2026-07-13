/* crypto.js
   AES-256-GCM kryptering av innehavsdata, lösenord -> nyckel via PBKDF2.
   Detta är den enda filen som rör kryptografi - byt algoritm/parametrar
   här om du någon gång vill uppgradera (t.ex. till WebAuthn PRF).
*/
const Crypto = {
  b64ToBytes(b64){ return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); },
  bytesToB64(bytes){ return btoa(String.fromCharCode(...new Uint8Array(bytes))); },

  async deriveKey(password, saltB64, iterations){
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name:'PBKDF2', salt:this.b64ToBytes(saltB64), iterations, hash:'SHA-256' },
      keyMaterial, { name:'AES-GCM', length:256 }, false, ['decrypt','encrypt']
    );
  },

  async decrypt(password, blob){
    const key = await this.deriveKey(password, blob.salt, blob.iterations);
    const plainBuf = await crypto.subtle.decrypt(
      { name:'AES-GCM', iv:this.b64ToBytes(blob.iv) },
      key, this.b64ToBytes(blob.ct)
    );
    return JSON.parse(new TextDecoder().decode(plainBuf));
  },

  async encrypt(password, dataObj, iterations = 100000){
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const saltB64 = this.bytesToB64(salt);
    const key = await this.deriveKey(password, saltB64, iterations);
    const payload = new TextEncoder().encode(JSON.stringify(dataObj));
    const ctBuf = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, payload);
    return { salt:saltB64, iv:this.bytesToB64(iv), iterations, ct:this.bytesToB64(ctBuf) };
  }
};
