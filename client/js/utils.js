export const generateId = () =>
  crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);

export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Extracts base64 raw data from DataURL
export const extractBase64Data = (dataUrl) => dataUrl.split(",")[1];
