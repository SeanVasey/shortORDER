import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
  MAX_STATELESS_PAYLOAD_CHARS,
  decodeShortcutPayload,
  encodeShortcutPayload,
} from '../lib/storage.ts';

const PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>WFWorkflowActions</key><array/></dict></plist>`;

describe('stateless shortcut payload codec', () => {
  it('round-trips name and plist through the URL payload', () => {
    const payload = encodeShortcutPayload('Focus block', PLIST);
    assert.ok(payload, 'small plist must fit in a URL');
    assert.match(payload, /^[\w-]+$/, 'payload must be base64url (URL-safe)');
    const file = decodeShortcutPayload(payload);
    assert.ok(file);
    assert.equal(file.name, 'Focus block');
    assert.equal(new TextDecoder().decode(file.body), PLIST);
  });

  it('refuses to encode a plist too large for a URL', () => {
    // Incompressible filler — repetitive data would gzip under the cap.
    const huge = PLIST + '<!--' + randomBytes(30_000).toString('hex') + '-->';
    assert.equal(encodeShortcutPayload('Huge', huge), null);
  });

  it('rejects tampered and malformed payloads', () => {
    const payload = encodeShortcutPayload('Focus block', PLIST);
    assert.equal(decodeShortcutPayload(payload.slice(0, -8) + 'AAAAAAAA'), null);
    assert.equal(decodeShortcutPayload(''), null);
    assert.equal(decodeShortcutPayload('not/base64url+chars=='), null);
    assert.equal(decodeShortcutPayload('A'.repeat(MAX_STATELESS_PAYLOAD_CHARS + 1)), null);
  });

  it('rejects payloads whose content is not an XML plist', () => {
    const bogus = gzipSync(
      Buffer.from(JSON.stringify({ name: 'x', plist: '<html>not a plist</html>' })),
    ).toString('base64url');
    assert.equal(decodeShortcutPayload(bogus), null);
  });
});
