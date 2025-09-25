import {ApplierConfig} from '../interfaces/config';

export const DefaultApplierConfig: ApplierConfig = {
  multiKeyPolicy: 'concat',
  concatSeparator: ' ',
  processedClass: 'jipt-translation',
  conflictedClass: 'jipt-conflict',
  updatedClass: 'jipt-updated',
  idAttribute: 'data-jipt-ids',
};
