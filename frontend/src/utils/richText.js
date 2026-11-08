const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] };

const parseJson = (value) => {
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed?.type === 'doc' ? parsed : null;
  } catch {
    return null;
  }
};

/** Converte texto simples antigo ou JSON TipTap num documento válido para o editor. */
export const toRichDocument = (value) => {
  if (!value || !String(value).trim()) return emptyDocument;
  const parsed = parseJson(value);
  if (parsed) return parsed;
  return {
    type: 'doc',
    content: String(value).split(/\r?\n/).map((line) => (
      line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' }
    )),
  };
};

const collect = (node, out) => {
  switch (node.type) {
    case 'text':
      out.push(node.text ?? '');
      break;
    case 'hardBreak':
      out.push('\n');
      break;
    case 'horizontalRule':
      out.push('\n---\n');
      break;
    case 'bulletList':
    case 'orderedList':
      (node.content ?? []).forEach((item, index) => {
        out.push(node.type === 'bulletList' ? '- ' : `${index + 1}. `);
        collect({ type: 'inline', content: item.content }, out);
        out.push('\n');
      });
      out.push('\n');
      break;
    case 'doc':
      (node.content ?? []).forEach((child) => collect(child, out));
      break;
    case 'inline':
      (node.content ?? []).forEach((child, index) => {
        if (index > 0) out.push('\n');
        if (child.type === 'paragraph' || child.type === 'listItem') {
          (child.content ?? []).forEach((inner) => collect(inner, out));
        } else {
          collect(child, out);
        }
      });
      break;
    default:
      (node.content ?? []).forEach((child) => collect(child, out));
      out.push('\n\n');
  }
};

/** Texto simples de um valor formatado (para tabelas, pesquisa e exportação). */
export const richTextToPlain = (value) => {
  if (!value || !String(value).trim()) return '';
  const parsed = parseJson(value);
  if (!parsed) return String(value).trim();
  const out = [];
  collect(parsed, out);
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

export const richTextIsEmpty = (value) => richTextToPlain(value) === '';
