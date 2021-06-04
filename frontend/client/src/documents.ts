import { Document } from '@mintter/api/documents/v1alpha/documents'
import { mockDocument } from './mock'

/**
 * 
 * @param id 
 * @returns 
 */
export async function getDocument(id: string): Promise<Document> {
  console.warn('called mocked function "getDocument"');
  return mockDocument({ id })
}