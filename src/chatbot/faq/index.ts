import { adminFAQ } from './adminFAQ';
import { shFAQ } from './shFAQ';
import { hbaFAQ } from './hbaFAQ';
import { hcmFAQ } from './hcmFAQ';
import { hccFAQ } from './hccFAQ';
import { FAQ } from '../types/chatbot.types';

export const getFAQByRole = (role: string): FAQ[] => {
  switch (role.toLowerCase()) {
    case 'admin':
      return adminFAQ;
    case 'sh':
      return shFAQ;
    case 'hba':
      return hbaFAQ;
    case 'hcm':
      return hcmFAQ;
    case 'hcc':
      return hccFAQ;
    default:
      return [];
  }
};
