export const Base64 = {
  _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

  encode(input: string): string {
    let output = '';
    let i = 0;
    const utf8 = Base64._utf8Encode(input);
    while (i < utf8.length) {
      const chr1 = utf8.charCodeAt(i++);
      const chr2 = utf8.charCodeAt(i++);
      const chr3 = utf8.charCodeAt(i++);
      const enc1 = chr1 >> 2;
      const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      let enc4 = chr3 & 63;
      if (isNaN(chr2)) enc3 = enc4 = 64;
      else if (isNaN(chr3)) enc4 = 64;
      output +=
        Base64._keyStr.charAt(enc1) +
        Base64._keyStr.charAt(enc2) +
        Base64._keyStr.charAt(enc3) +
        Base64._keyStr.charAt(enc4);
    }
    return output;
  },

  decode(input: string): string {
    let output = '';
    let i = 0;
    const s = input.replace(/[^A-Za-z0-9+/=]/g, '');
    while (i < s.length) {
      const enc1 = Base64._keyStr.indexOf(s.charAt(i++));
      const enc2 = Base64._keyStr.indexOf(s.charAt(i++));
      const enc3 = Base64._keyStr.indexOf(s.charAt(i++));
      const enc4 = Base64._keyStr.indexOf(s.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr1);
      if (enc3 !== 64) output += String.fromCharCode(chr2);
      if (enc4 !== 64) output += String.fromCharCode(chr3);
    }
    return Base64._utf8Decode(output);
  },

  _utf8Encode(s: string): string {
    return unescape(encodeURIComponent(s));
  },

  _utf8Decode(s: string): string {
    try {
      return decodeURIComponent(escape(s));
    } catch {
      return s;
    }
  },
};
