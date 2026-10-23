import { expect, it, vi } from 'vitest';
vi.mock('@/lib/llm/web-llm', () => ({getLoadedModelId: vi.fn(),chat:vi.fn()}));
import { chat, getLoadedModelId } from '@/lib/llm/web-llm';
import { extractFactsWithLlm } from './llm-extractor';
const input={projectId:'p',subject:'contract_management' as const,documents:[{id:'d',project_id:'p',filename:'contract.txt',mime_type:'text/plain',size_bytes:100,document_type:'contract' as const,classification_confidence:'HIGH' as const,preview_text:null,created_at:'2026-10-23'}],documentTexts:{d:'SYNTHETIC contract. The parties agree to the supplied scope. '.repeat(3)},authorityEn:null,counterpartyEn:null};
it('no model retains clearly tagged template assets',async()=>{
 vi.mocked(getLoadedModelId).mockReturnValue(null);
 const result=await extractFactsWithLlm(input);
 expect(result.fallback_reason).toBe('model_not_loaded');
 expect(result.facts.length).toBeGreaterThan(0);
 expect(result.facts.every(f=>f.origin==='template'&&f.confidence==='LOW'&&!f.user_verified)).toBe(true);
});
it('model failure never logs raw provider errors or yields verified facts',async()=>{
 vi.mocked(getLoadedModelId).mockReturnValue('synthetic');
 vi.mocked(chat).mockRejectedValue(new Error('SYNTHETIC_PRIVATE_PROMPT'));
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 const result=await extractFactsWithLlm(input);
 expect(result.fallback_reason).toBe('chat_failed');
 expect(result.facts.every(f=>f.origin==='template'&&!f.user_verified)).toBe(true);
 expect(warn).not.toHaveBeenCalled();
 warn.mockRestore();
});
