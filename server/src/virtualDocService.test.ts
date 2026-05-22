import { describe, it, expect } from 'vitest';
import { VirtualDocService } from './virtualDocService.js';
import { parseVeml } from './vemlParser.js';

describe('VirtualDocService', () => {
  describe('indexDocument', () => {
    it('extracts inline script blocks', () => {
      const text = '<veml><metadata><script>var x = 1;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const scripts = svc.getInlineScripts('file:///world.veml');
      expect(scripts).toHaveLength(1);
      expect(scripts[0].text).toBe('var x = 1;');
    });

    it('extracts multiple inline script blocks', () => {
      const text = '<veml><metadata><script>var a = 1;</script><script>var b = 2;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const scripts = svc.getInlineScripts('file:///world.veml');
      expect(scripts).toHaveLength(2);
      expect(scripts[0].text).toBe('var a = 1;');
      expect(scripts[1].text).toBe('var b = 2;');
    });

    it('skips file path references', () => {
      const text = '<veml><metadata><script>Scripts/index.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      expect(svc.getInlineScripts('file:///world.veml')).toHaveLength(0);
    });

    it('handles mixed inline and file ref scripts', () => {
      const text = '<veml><metadata><script>var x = 1;</script><script>Scripts/index.js</script><script>var y = 2;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const scripts = svc.getInlineScripts('file:///world.veml');
      expect(scripts).toHaveLength(2);
      expect(scripts[0].text).toBe('var x = 1;');
      expect(scripts[1].text).toBe('var y = 2;');
    });

    it('skips empty script elements', () => {
      const text = '<veml><metadata><script></script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      expect(svc.getInlineScripts('file:///world.veml')).toHaveLength(0);
    });

    it('handles empty document', () => {
      const text = '';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      expect(svc.getInlineScripts('file:///world.veml')).toHaveLength(0);
    });

    it('is idempotent', () => {
      const text = '<veml><metadata><script>var x = 1;</script></metadata></veml>';
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', parseVeml(text), text);
      svc.indexDocument('file:///world.veml', parseVeml(text), text);

      expect(svc.getInlineScripts('file:///world.veml')).toHaveLength(1);
    });
  });

  describe('removeDocument', () => {
    it('removes all inline script data', () => {
      const text = '<veml><metadata><script>var x = 1;</script></metadata></veml>';
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', parseVeml(text), text);
      svc.removeDocument('file:///world.veml');

      expect(svc.getInlineScripts('file:///world.veml')).toHaveLength(0);
    });
  });

  describe('offset mapping', () => {
    it('maps VEML offset to JS offset', () => {
      const text = '<veml><metadata><script>var x = 1;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const scripts = svc.getInlineScripts('file:///world.veml');
      const vemlOffset = scripts[0].vemlOffset + 4; // pointing at "x" in "var x = 1;"

      const result = svc.vemlOffsetToJsOffset('file:///world.veml', vemlOffset);
      expect(result).toBeDefined();
      expect(result!.scriptIndex).toBe(0);
      expect(result!.jsOffset).toBe(4);
    });

    it('returns undefined for offset outside script blocks', () => {
      const text = '<veml><metadata><script>var x = 1;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const result = svc.vemlOffsetToJsOffset('file:///world.veml', 5); // in <veml>
      expect(result).toBeUndefined();
    });

    it('round-trips VEML → JS → VEML correctly', () => {
      const text = '<veml><metadata><script>var x = 1;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const scripts = svc.getInlineScripts('file:///world.veml');
      const vemlOffset = scripts[0].vemlOffset + 6;

      const jsResult = svc.vemlOffsetToJsOffset('file:///world.veml', vemlOffset);
      expect(jsResult).toBeDefined();

      const roundTripped = svc.jsOffsetToVemlOffset('file:///world.veml', jsResult!.scriptIndex, jsResult!.jsOffset);
      expect(roundTripped).toBe(vemlOffset);
    });

    it('correctly maps offsets in second script block', () => {
      const text = '<veml><metadata><script>var a = 1;</script><script>var b = 2;</script></metadata></veml>';
      const doc = parseVeml(text);
      const svc = new VirtualDocService();

      svc.indexDocument('file:///world.veml', doc, text);

      const scripts = svc.getInlineScripts('file:///world.veml');
      const secondBlockStart = scripts[1].vemlOffset;

      const result = svc.vemlOffsetToJsOffset('file:///world.veml', secondBlockStart + 4);
      expect(result).toBeDefined();
      expect(result!.scriptIndex).toBe(1);
      expect(result!.jsOffset).toBe(4);

      // Round-trip
      const roundTripped = svc.jsOffsetToVemlOffset('file:///world.veml', 1, 4);
      expect(roundTripped).toBe(secondBlockStart + 4);
    });

    it('returns undefined for unknown URI', () => {
      const svc = new VirtualDocService();
      expect(svc.vemlOffsetToJsOffset('file:///unknown.veml', 10)).toBeUndefined();
    });
  });
});
