// Device identification and browser information helpers

export const getDeviceId = (): string => {
  let id = localStorage.getItem('ts_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 11);
    localStorage.setItem('ts_device_id', id);
  }
  return id;
};

export const getDeviceName = (): string => {
  if (typeof navigator === 'undefined') return "Web Browser";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android Device";
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "MacBook";
  return "Web Browser";
};
