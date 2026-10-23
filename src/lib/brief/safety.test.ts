import { expect, it } from 'vitest';
import { composeBrief } from './composer';
import { asTemplateFacts, runMockExtraction } from '@/lib/extraction/mock-extractor';
it('marks illustrative brief and exports as demo, not source-verified advice', () => {
 const facts = asTemplateFacts(runMockExtraction({projectId:'p',subject:'contract_management',documents:[],authorityEn:null,counterpartyEn:null}));
 const result = composeBrief({projectName:'Synthetic',subject:'contract_management',audience:'director',authorityEn:null,authorityAr:null,counterpartyEn:null,counterpartyAr:null,facts,locale:'en'});
 expect(result.text_en).toContain('DEMO');
 expect(result.text_ar).toContain('تجريبي');
});

import { canPublishBrief, hasSource, reviewedFacts, reviewKey } from './evidence-gate';
import type { DbExtractedFact } from '@/types/database';
const fact: DbExtractedFact = {id:'f',project_id:'p',document_id:'d',fact_type:'contract_value',payload_json:{amount:1000},citation_page:1,citation_quote:'The contract value is AED 1000.',confidence:'HIGH',user_verified:false,origin:'llm',created_at:'2026-10-23'};
const texts = {d:'The contract value is AED 1000.'};
const reviewed = () => ({...fact,user_verified:true,review_key:reviewKey(fact)});
it('does not mistake citation integrity for semantic review', () => {
 expect(hasSource(fact,texts)).toBe(true);
 expect(reviewedFacts([fact],texts)).toBe(false);
 expect(reviewedFacts([{...fact,user_verified:true}],texts)).toBe(false);
});
it('blocks templates, missing or mismatched sources and numeric claims without digits', () => {
 expect(hasSource({...reviewed(),origin:'template'},texts)).toBe(false);
 expect(hasSource(reviewed(),{})).toBe(false);
 expect(hasSource(reviewed(),{d:'The contract is unrelated.'})).toBe(false);
 expect(hasSource({...reviewed(),citation_quote:'The parties agree.'},{d:'The parties agree.'})).toBe(false);
 expect(hasSource({...reviewed(),payload_json:{amount:9999}},texts)).toBe(false);
 expect(hasSource({...reviewed(),payload_json:{nested:[{percent:3.2}]}},texts)).toBe(false);
});
it('accepts explicit source-bound human review and rejects changed claims or source after reload', () => {
 expect(reviewedFacts([reviewed()],texts)).toBe(true);
 expect(reviewedFacts([{...reviewed(),payload_json:{amount:2000}}],texts)).toBe(false);
 expect(reviewedFacts([reviewed()],{})).toBe(false);
});
it('publishes only current reviewed source brief, never legacy or changed text', () => {
 const facts=[reviewed()];
 const result=composeBrief({projectName:'Synthetic',subject:'contract_management',audience:'director',authorityEn:null,authorityAr:null,counterpartyEn:null,counterpartyAr:null,facts,locale:'en',documentTexts:texts});
 expect(result.text_en).toContain('Locally reviewed source claims');
 expect(result.text_en).not.toContain('No contractual remedy');
 const brief={...result,evidence_key:JSON.stringify([facts.map(reviewKey),result.text_en,result.text_ar])};
 expect(canPublishBrief(facts,texts,brief)).toBe(true);
 expect(canPublishBrief(facts,texts,{...brief,text_en:'replacement'})).toBe(false);
 expect(canPublishBrief(facts,{},brief)).toBe(false);
 expect(canPublishBrief(facts,texts,{...brief,evidence_key:undefined})).toBe(false);
});
