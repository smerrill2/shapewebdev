// Add TextEncoder polyfill for tests
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = function TextEncoder() {
    return {
      encode: function(str) {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          arr[i] = str.charCodeAt(i);
        }
        return arr;
      }
    };
  };
} 