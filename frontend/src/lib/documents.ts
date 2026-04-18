import { AIService } from './ai';

export interface BusinessDocument {
  id: string;
  type: 'invoice' | 'proposal' | 'contract' | 'report';
  title: string;
  content: string;
  recipient: string;
  amount?: string;
  status: 'draft' | 'sent' | 'signed';
  createdAt: string;
  metadata?: Record<string, any>;
}

const TEMPLATES = {
  invoice: (details: any) => `
You are a professional business document writer. Generate a detailed, formal INVOICE with the following structure:

INVOICE #${Math.floor(Math.random() * 9000 + 1000)}
Date: ${new Date().toLocaleDateString('en-GB')}
Due Date: ${new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-GB')}

FROM: ${details.businessName || 'BritSync Agency'}
TO: ${details.client || 'Client Name'}

SERVICES/ITEMS:
${(details.items || ['Consulting Services']).map((item: string, i: number) => `${i + 1}. ${item} - £${details.amount ? Math.floor(parseInt(details.amount.replace(/[^0-9]/g, '')) / (details.items?.length || 1)) : '500'}`).join('\n')}

SUBTOTAL: ${details.amount || '£1,500'}
VAT (20%): £${Math.floor(parseInt((details.amount || '£1500').replace(/[^0-9]/g, '')) * 0.2)}
TOTAL DUE: ${details.amount || '£1,800'}

Payment Terms: Net 30 days
Bank: Barclays UK | Sort: 20-48-37 | Account: 93847261

Thank you for your business.`,

  proposal: (details: any) => `
Write a compelling BUSINESS PROPOSAL for ${details.client || 'a prospective client'}.

Context:
- Our Company: ${details.businessName || 'BritSync Agency'}  
- Client: ${details.client || 'Client Name'}
- Project: ${details.project || 'Digital Transformation'}
- Value: ${details.amount || '£5,000'}

Write a professional proposal with: Executive Summary, Our Approach, Deliverables, Timeline, Investment, and Why Us sections. Be persuasive and specific.`,

  contract: (details: any) => `
Write a professional SERVICE AGREEMENT / CONTRACT between ${details.businessName || 'BritSync Agency'} and ${details.client || 'Client Name'}.

Include:
- Parties Involved
- Scope of Services: ${details.project || 'Digital Services'}
- Payment Terms: ${details.amount || '£2,500'} per month
- Start Date: ${new Date().toLocaleDateString('en-GB')}
- Duration: ${details.duration || '3 months'}
- Intellectual Property clause
- Confidentiality clause
- Termination clause
- Governing Law: England & Wales

Make it legally sound but readable. Include signature blocks at the end.`,

  report: (details: any) => `
Write a professional BUSINESS PERFORMANCE REPORT for ${details.businessName || 'BritSync Agency'}.

Period: ${details.period || 'Q1 2026'}
Industry: ${details.industry || 'Technology'}

Include: Executive Summary, KPI Overview, Financial Highlights, Key Wins, Challenges & Mitigations, Strategic Outlook.
Be data-driven and professionally written.`,
};

export const DocumentService = {
  async generateDraft(type: 'invoice' | 'proposal' | 'contract' | 'report', details: any): Promise<string> {
    const templateFn = TEMPLATES[type];
    if (!templateFn) throw new Error(`Unknown document type: ${type}`);
    
    const prompt = templateFn(details);
    return await AIService.analyzeFinancialScenario(prompt);
  },

  async saveDocument(doc: Omit<BusinessDocument, 'id' | 'createdAt'>): Promise<BusinessDocument> {
    const newDoc: BusinessDocument = {
      ...doc,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: doc.status || 'draft',
    };

    const docs = this.getAllDocuments();
    localStorage.setItem('britsync_docs', JSON.stringify([newDoc, ...docs]));
    return newDoc;
  },

  updateDocument(id: string, updates: Partial<BusinessDocument>): BusinessDocument | null {
    const docs = this.getAllDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) return null;
    docs[index] = { ...docs[index], ...updates };
    localStorage.setItem('britsync_docs', JSON.stringify(docs));
    return docs[index];
  },

  deleteDocument(id: string): void {
    const docs = this.getAllDocuments().filter(d => d.id !== id);
    localStorage.setItem('britsync_docs', JSON.stringify(docs));
  },

  getAllDocuments(): BusinessDocument[] {
    const data = localStorage.getItem('britsync_docs');
    return data ? JSON.parse(data) : [];
  },

  getDocumentsByType(type: BusinessDocument['type']): BusinessDocument[] {
    return this.getAllDocuments().filter(d => d.type === type);
  }
};
