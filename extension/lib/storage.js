const STORAGE_AREA_LOCAL = "local";
const STORAGE_AREA_SESSION = "session";

function getArea(area) {
  if (area === STORAGE_AREA_SESSION) {
    return chrome.storage.session;
  }
  return chrome.storage.local;
}

export async function getStoredValue(key, area = STORAGE_AREA_LOCAL) {
  const storageArea = getArea(area);
  const result = await storageArea.get(key);
  return result[key];
}

export async function setStoredValue(key, value, area = STORAGE_AREA_LOCAL) {
  const storageArea = getArea(area);
  await storageArea.set({ [key]: value });
}

export async function removeStoredValue(key, area = STORAGE_AREA_LOCAL) {
  const storageArea = getArea(area);
  await storageArea.remove(key);
}

export { STORAGE_AREA_LOCAL, STORAGE_AREA_SESSION };
