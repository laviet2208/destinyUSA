type EncryptedValue = { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };
let database: Promise<IDBDatabase> | undefined;
let encryptionKey: Promise<CryptoKey> | undefined;

function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('destiny-mobile-preview', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('values');
      request.result.createObjectStore('keys');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Không mở được bộ nhớ trình duyệt. Vui lòng cho phép lưu dữ liệu trang web.'));
    request.onblocked = () => reject(new Error('Hãy đóng tab Destiny USA cũ rồi thử lại.'));
  });
  return database;
}

async function storedValue<Result>(store: string, mode: IDBTransactionMode, operation: (objectStore: IDBObjectStore) => IDBRequest<Result>): Promise<Result> {
  const connection = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction(store, mode);
    const request = operation(transaction.objectStore(store));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Không lưu được dữ liệu trên trình duyệt.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Bộ nhớ trình duyệt đã hủy thao tác.'));
  });
}

async function getEncryptionKey() {
  encryptionKey ??= (async () => {
    if (!globalThis.crypto?.subtle) throw new Error('Bản web cần được mở qua localhost hoặc HTTPS.');
    const existing = await storedValue<CryptoKey | undefined>('keys', 'readonly', store => store.get('device'));
    if (existing) return existing;
    const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const connection = await openDatabase();
    return new Promise<CryptoKey>((resolve, reject) => {
      const transaction = connection.transaction('keys', 'readwrite');
      const store = transaction.objectStore('keys');
      const request = store.get('device');
      let key = generated;
      request.onsuccess = () => {
        if (request.result) key = request.result;
        else store.put(generated, 'device');
      };
      transaction.oncomplete = () => resolve(key);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  })();
  try { return await encryptionKey; } catch (failure) { encryptionKey = undefined; throw failure; }
}

export async function getItemAsync(key: string): Promise<string | null> {
  const value = await storedValue<EncryptedValue | undefined>('values', 'readonly', store => store.get(key));
  if (!value) return null;
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: value.iv, additionalData: new TextEncoder().encode(key) }, await getEncryptionKey(), value.data);
  return new TextDecoder().decode(decrypted);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  const secret = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, secret, new TextEncoder().encode(value));
  await storedValue('values', 'readwrite', store => store.put({ iv, data }, key));
}

export async function deleteItemAsync(key: string): Promise<void> {
  await storedValue('values', 'readwrite', store => store.delete(key));
}
