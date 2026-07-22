import { useState, useEffect } from "react";

type ApiKeys = {
  groqApiKey: string;
  githubToken: string;
};

const STORAGE_KEY = "codelens-api-keys";

const DEFAULT_KEYS: ApiKeys = {
  groqApiKey: "",
  githubToken: "",
};

function loadKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_KEYS, ...parsed };
    }
  } catch {}
  return DEFAULT_KEYS;
}

function saveKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function useApiKeys() {
  const [keys, setKeysState] = useState<ApiKeys>(loadKeys);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveKeys(keys);
  }, [keys]);

  const setKeys = (newKeys: ApiKeys) => {
    setKeysState(newKeys);
  };

  const hasGroqKey = keys.groqApiKey.trim().length > 0;

  return {
    keys,
    setKeys,
    isOpen,
    setIsOpen,
    hasGroqKey,
  };
}
