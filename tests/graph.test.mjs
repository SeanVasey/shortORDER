import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateGraph } from '../lib/graph.ts';

describe('validateGraph', () => {
  it('normalizes safe graph data', () => {
    const graph = validateGraph({
      title: '  Test shortcut  ',
      summary: 'Works',
      feasibility: 'native',
      confidence: 1.4,
      actions: [{ identifier: 'is.workflow.actions.comment', parameters: { WFCommentActionText: ' hi ' }, note: 'Add note' }],
      importQuestions: [],
      gaps: [],
    });
    assert.equal(graph.title, 'Test shortcut');
    assert.equal(graph.confidence, 1);
    assert.equal(graph.actions[0].parameters.WFCommentActionText, 'hi');
  });

  it('rejects unsafe prototype keys in model parameters', () => {
    assert.throws(() => validateGraph({
      title: 'Bad',
      summary: '',
      feasibility: 'native',
      confidence: 0.9,
      actions: [{ identifier: 'x', parameters: JSON.parse('{"__proto__":"pollution"}'), note: '' }],
      importQuestions: [],
      gaps: [],
    }), /unsafe key/);
  });
});
