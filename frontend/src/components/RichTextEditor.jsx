import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
  BackgroundColor,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Minus,
  Pilcrow,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { IconButton, Tooltip } from '@mui/material';
import { toRichDocument } from '../utils/richText';
import './rich-text-field.css';

const editorExtensions = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight,
  TextStyle,
  FontSize,
  FontFamily,
  LineHeight,
  Color,
  BackgroundColor,
  Link.configure({
    openOnClick: false,
    protocols: ['http', 'https', 'mailto'],
    isAllowedUri: (url, context) =>
      context.defaultValidate(url) && /^(https?:|mailto:)/i.test(url),
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
  }),
];

const parseDocument = toRichDocument;

function ToolbarButton({ label, active, onClick, children, disabled = false }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          sx={{ color: active ? 'primary.main' : 'text.secondary' }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function RichTextEditor({
  value,
  onChange,
  ariaLabel = 'Detalhes formatados do módulo',
  emptyAsBlank = false,
}) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: parseDocument(value),
    onUpdate: ({ editor: currentEditor }) => onChange(
      emptyAsBlank && currentEditor.isEmpty ? '' : JSON.stringify(currentEditor.getJSON()),
    ),
    editorProps: {
      attributes: {
        class: 'cacoin-rich-text-content',
        'aria-label': ariaLabel,
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('Endereço do link');
    if (!url) return;
    const normalizedUrl = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().setLink({ href: normalizedUrl }).run();
  };

  return (
    <div className="cacoin-rich-text cacoin-rich-text-scroll">
      <div className="cacoin-rich-text-toolbar" role="toolbar" aria-label="Formatação do texto">
        <ToolbarButton label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={17} />
        </ToolbarButton>
        <ToolbarButton label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={17} />
        </ToolbarButton>
        <ToolbarButton label="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={17} />
        </ToolbarButton>
        <ToolbarButton label="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={17} />
        </ToolbarButton>
        <ToolbarButton label="Realçar" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={17} />
        </ToolbarButton>
        <ToolbarButton label="Lista com pontos" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={17} />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={17} />
        </ToolbarButton>
        <ToolbarButton label="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={17} />
        </ToolbarButton>
        <ToolbarButton label="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={17} />
        </ToolbarButton>
        <ToolbarButton label="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={17} />
        </ToolbarButton>
        <ToolbarButton label="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={17} />
        </ToolbarButton>
        <ToolbarButton label="Parágrafo" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow size={17} />
        </ToolbarButton>
        <ToolbarButton label="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={17} />
        </ToolbarButton>
        <ToolbarButton label="Bloco de código" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code size={17} />
        </ToolbarButton>
        <ToolbarButton label="Alinhar à esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={17} />
        </ToolbarButton>
        <ToolbarButton label="Centrar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={17} />
        </ToolbarButton>
        <ToolbarButton label="Alinhar à direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={17} />
        </ToolbarButton>
        <ToolbarButton label="Justificar" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={17} />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon size={17} />
        </ToolbarButton>
        <label className="cacoin-rich-text-color" title="Cor do texto">
          <span aria-hidden="true">A</span>
          <input
            aria-label="Cor do texto"
            type="color"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
        </label>
        <label className="cacoin-rich-text-color" title="Cor de fundo">
          <span aria-hidden="true">▰</span>
          <input
            aria-label="Cor de fundo"
            type="color"
            onChange={(event) => editor.chain().focus().setBackgroundColor(event.target.value).run()}
          />
        </label>
        <select
          aria-label="Tamanho do texto"
          className="cacoin-rich-text-select"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              editor.chain().focus().setFontSize(event.target.value).run();
            } else {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
        >
          <option value="">Tamanho</option>
          {[12, 14, 16, 18, 20, 24, 28, 32, 40].map((size) => (
            <option key={size} value={`${size}px`}>{size}px</option>
          ))}
        </select>
        <select
          aria-label="Espaçamento entre linhas"
          className="cacoin-rich-text-select"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              editor.chain().focus().setLineHeight(event.target.value).run();
            } else {
              editor.chain().focus().unsetLineHeight().run();
            }
          }}
        >
          <option value="">Espaçamento</option>
          {['1', '1.15', '1.5', '2'].map((height) => (
            <option key={height} value={height}>{height}</option>
          ))}
        </select>
        <select
          aria-label="Tipo de letra"
          className="cacoin-rich-text-select"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              editor.chain().focus().setFontFamily(event.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
        >
          <option value="">Tipo de letra</option>
          {['Arial', 'Georgia', 'Tahoma', 'Times New Roman', 'Verdana'].map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
        <ToolbarButton label="Remover formatação" onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser size={17} />
        </ToolbarButton>
        <ToolbarButton label="Anular" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={17} />
        </ToolbarButton>
        <ToolbarButton label="Refazer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={17} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextViewer({ value }) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: parseDocument(value),
    editable: false,
    editorProps: {
      attributes: {
        class: 'cacoin-rich-text-content',
      },
    },
  });

  if (!editor) return null;
  return <div className="cacoin-rich-text cacoin-rich-text-viewer cacoin-rich-text-scroll"><EditorContent editor={editor} /></div>;
}
