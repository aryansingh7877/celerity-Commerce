/**
 * P0 self-check — no network secrets required for static assertions.
 * Live AI/WhatsApp checks run when env keys are present.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const root = resolve(import.meta.dirname, '../..');
  const waSrc = readFileSync(resolve(root, 'server/src/services/whatsapp.ts'), 'utf8');
  assert(!/Fallback plain text/.test(waSrc), 'plain-text fallback comment removed');
  assert(!/\btype:\s*['"]text['"]\s*,\s*text:\s*\{/.test(waSrc), 'whatsapp.ts has no plain-text send body');
  assert(/type:\s*['"]template['"]/.test(waSrc), 'whatsapp.ts sends template messages');
  assert(/Template-only/.test(waSrc), 'whatsapp.ts documents template-only mode');
  assert(/WHATSAPP_TEMPLATE_PARAM_COUNT\s*=\s*7/.test(waSrc), 'template expects 7 body params');

  const notifySrc = readFileSync(resolve(root, 'server/src/services/supplierNotify.ts'), 'utf8');
  assert(/supplier_notify_locks/.test(notifySrc), 'supplierNotify uses DB lock table');
  assert(/forceSend/.test(notifySrc), 'supplierNotify supports forceSend for safe retry');

  const consumerSrc = readFileSync(
    resolve(root, 'server/src/workers/inventoryRestockConsumer.ts'),
    'utf8'
  );
  assert(
    /notifySupplierOnStockDepletion/.test(consumerSrc),
    'Kafka consumer shares notifySupplierOnStockDepletion'
  );
  assert(
    !/sendRestockWhatsApp/.test(consumerSrc),
    'Kafka consumer does not call WhatsApp directly'
  );

  const adminSrc = readFileSync(resolve(root, 'server/src/routes/admin.ts'), 'utf8');
  assert(/aiGenerate/.test(adminSrc), 'dead-stock explain uses aiGenerate');
  assert(
    /Retry allowed only for failed/.test(adminSrc),
    'retry rejects non-failed notifications'
  );

  const gwSrc = readFileSync(resolve(root, 'server/src/services/aiGateway.ts'), 'utf8');
  assert(/groqGenerate/.test(gwSrc) && /huggingfaceGenerate/.test(gwSrc), 'gateway has Groq + HF');
  assert(/ollamaGenerate/.test(gwSrc), 'gateway falls back to Ollama');
  assert(/All AI providers failed/.test(gwSrc), 'gateway surfaces clear all-fail error');

  // Dynamic import after static checks
  const { whatsappTemplateStatus } = await import('../src/services/whatsapp.js');
  const tpl = whatsappTemplateStatus();
  assert(tpl.mode === 'template_only', 'template status mode is template_only');
  assert(tpl.expectedBodyParams === 7, 'health/template-check expects 7 params');

  const { aiGenerate, aiGatewayStatus } = await import('../src/services/aiGateway.js');
  const status = await aiGatewayStatus();
  console.log('ai status', {
    groq: status.groq.configured,
    hf: status.huggingface.configured,
    ollama: status.ollama.reachable,
  });

  const prompt =
    'Using ONLY this report, say how many SKUs are listed (one sentence):\nSKU-A | Widget @ City: stock=2, days_idle=40';
  const result = await aiGenerate(prompt);
  if (result.ok) {
    console.log(`ok: aiGenerate via ${result.provider}/${result.model}`);
    console.log(result.text.slice(0, 200));
  } else {
    console.log('aiGenerate all providers failed (expected if no keys / ollama down):');
    console.log(result.error);
    assert(/All AI providers failed/.test(result.error), 'all-fail error message present');
  }

  console.log('\nP0 self-check complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
