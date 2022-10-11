import { access } from 'fs/promises';

export const exists = async (file: string) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
