/* ExamLab V40 — reflow PDF-extracted plain-text questions. */
(function () {
  'use strict';
  const original = window.questionContent;
  if (typeof original !== 'function') return;
  const isStructure = line => /^(?:[-•●▪–—]\s+|(?:[a-zA-Z]\)|[a-zA-Z]\.\s+|\d{1,3}[.)]\s+)|(?:Đáp\s*(?:số|án)|Trả lời|Phần\s+[IVX]+|Câu\s+\d+)\s*[:.]|(?:Bảng|Hình)\s+\d+\s*[:.])/iu.test(line);
  function reflow(value) {
    const blocks = [];
    let current = '';
    function flush() { if (current) { blocks.push(current); current = ''; } }
    for (const raw of String(value ?? '').replace(/\r\n?/g, '\n').split('\n')) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (isStructure(line)) flush();
      current += (current ? ' ' : '') + line;
    }
    flush();
    return blocks.join('\n');
  }
  window.questionContent = function(q) {
    // Preserve HTML, diagrams, tables and rich formatting exactly as before.
    if (!q || q.contentHtml || typeof q.text !== 'string') return original(q);
    // Copy for rendering only: never alter saved questions or exam answers.
    return original({...q, text: reflow(q.text)});
  };
})();
