import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  FolderTree,
  Home,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  PanelLeft,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import logo from '../assets/logo.png';
import {
  createFolder,
  deleteFolder,
  deleteFolderFile,
  downloadFolderZip,
  getFolderFiles,
  getFolderFileUrl,
  getFolders,
  moveFolder,
  renameFolder,
  uploadFolderFiles,
} from '../services/api';
import StandardTable from '../components/StandardTable';
import { filterBySearch, normalizeSearchText } from '../utils/search';
import FolderGraphic from './folders/FolderGraphic';
import {
  avatarColor,
  creatorKey,
  creatorName,
  fileKind,
  formatDate,
  formatDateTime,
  formatSize,
  initialsOf,
  pluralize,
} from './folders/folderUtils';
import './folders/folders.css';

const requestMessage = async (requestError) => {
  const data = requestError.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || requestError.message;
    } catch {
      return requestError.message;
    }
  }
  return data?.message || requestError.message;
};

const FileIcon = ({ name }) => {
  const kind = fileKind(name);
  const Icon = { sheet: FileSpreadsheet, archive: FileArchive, image: ImageIcon }[kind] ?? FileText;
  return <span className={`kb-file-icon ${kind}`}><Icon size={16} strokeWidth={1.6} aria-hidden="true" /></span>;
};

const Avatar = ({ name, code, size = 'md' }) => (
  <span className={`kb-avatar ${size}`} style={{ background: avatarColor(code || name) }} aria-hidden="true">
    {initialsOf(name)}
  </span>
);

const KbButton = forwardRef(function KbButton(props, ref) {
  return <ButtonBase ref={ref} component="button" {...props} />;
});

const fileColumns = [
  { key: 'name', label: 'Nome' },
  { key: 'addedBy', label: 'Adicionado por' },
  { key: 'addedAt', label: 'Data' },
  { key: 'size', label: 'Tamanho', align: 'right' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

export default function FolderManagement() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [navTab, setNavTab] = useState('folders');
  const [creatorFilter, setCreatorFilter] = useState(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [zippingId, setZippingId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [moveTarget, setMoveTarget] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(undefined);
  const [filesDragOver, setFilesDragOver] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    document.title = 'Pastas — Gestão de ficheiros';
    document.body.classList.add('kb-body');
    return () => document.body.classList.remove('kb-body');
  }, []);

  useEffect(() => {
    const close = () => setMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const reload = async () => {
    const items = await getFolders();
    setFolders(items);
    setCurrentId((current) => (current != null && !items.some((item) => item.id === current) ? null : current));
    return items;
  };

  useEffect(() => {
    let active = true;
    getFolders()
      .then((items) => { if (active) setFolders(items); })
      .catch(async (loadError) => { if (active) setError(await requestMessage(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const loadFiles = async (folderId) => {
    if (folderId == null) {
      setFiles([]);
      return;
    }
    setFilesLoading(true);
    try {
      setFiles(await getFolderFiles(folderId));
    } catch (filesError) {
      setError(await requestMessage(filesError));
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setFileSearch('');
    if (currentId == null) {
      setFiles([]);
      return undefined;
    }
    setFilesLoading(true);
    getFolderFiles(currentId)
      .then((items) => { if (active) setFiles(items); })
      .catch(async (filesError) => { if (active) setError(await requestMessage(filesError)); })
      .finally(() => { if (active) setFilesLoading(false); });
    return () => { active = false; };
  }, [currentId]);

  const visibleFiles = useMemo(
    () => filterBySearch(files, fileSearch, (file) => [
      file.name,
      file.addedBy,
      file.addedByCode,
      formatDateTime(file.addedAt),
    ]),
    [files, fileSearch],
  );

  const byId = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const childrenMap = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const key = folder.parentId ?? null;
      map.set(key, [...(map.get(key) ?? []), folder]);
    });
    return map;
  }, [folders]);
  const childrenOf = (id) => childrenMap.get(id) ?? [];
  const descendantsOf = (id) => {
    const result = new Set();
    const visit = (parentId) => childrenOf(parentId).forEach((child) => {
      result.add(child.id);
      visit(child.id);
    });
    visit(id);
    return result;
  };
  const pathOf = (folder) => {
    const names = [];
    for (let item = folder; item; item = byId.get(item.parentId)) names.unshift(item.name);
    return names.join(' / ');
  };

  const currentFolder = byId.get(currentId) ?? null;
  const breadcrumb = [];
  for (let item = currentFolder; item; item = byId.get(item.parentId)) breadcrumb.unshift(item);

  const normalizedSearch = normalizeSearchText(searchTerm.trim());
  const matchesTree = (folder) => (
    normalizeSearchText(folder.name).includes(normalizedSearch)
    || childrenOf(folder.id).some(matchesTree)
  );
  const treeChildren = (id) => (normalizedSearch ? childrenOf(id).filter(matchesTree) : childrenOf(id));
  const gridFolders = normalizedSearch
    ? folders.filter((folder) => normalizeSearchText(folder.name).includes(normalizedSearch))
    : childrenOf(currentId);

  const creators = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const key = creatorKey(folder);
      const entry = map.get(key) ?? { key, name: creatorName(folder), code: folder.createdByCode, count: 0 };
      entry.count += 1;
      map.set(key, entry);
    });
    return [...map.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-MZ'));
  }, [folders]);

  const toggleExpanded = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const reveal = (id) => setExpanded((current) => {
    if (id == null || current.has(id)) return current;
    return new Set(current).add(id);
  });

  useEffect(() => {
    if (currentId == null) return;
    const ancestors = [];
    for (let item = byId.get(byId.get(currentId)?.parentId); item; item = byId.get(item.parentId)) {
      ancestors.push(item.id);
    }
    if (!ancestors.length) return;
    setExpanded((current) => (
      ancestors.every((id) => current.has(id)) ? current : new Set([...current, ...ancestors])
    ));
  }, [currentId, byId]);

  const closeDialog = () => {
    setDialog(null);
    setDialogError('');
  };
  const openCreate = (parent = null) => {
    setFolderName('');
    setDialogError('');
    setDialog({ type: 'create', parent });
  };
  const openRename = (folder) => {
    setFolderName(folder.name);
    setDialogError('');
    setDialog({ type: 'rename', folder });
  };
  const openMove = (folder) => {
    setMoveTarget(folder.parentId == null ? '' : String(folder.parentId));
    setDialogError('');
    setDialog({ type: 'move', folder });
  };
  const openDelete = (folder) => {
    setDialogError('');
    setDialog({ type: 'delete', folder });
  };
  const openDeleteFile = (file) => {
    setDialogError('');
    setDialog({ type: 'deleteFile', file });
  };

  const moveTargets = useMemo(() => {
    if (dialog?.type !== 'move') return [];
    const blocked = descendantsOf(dialog.folder.id);
    blocked.add(dialog.folder.id);
    return folders
      .filter((folder) => !blocked.has(folder.id))
      .map((folder) => ({ id: folder.id, label: pathOf(folder) }))
      .sort((left, right) => left.label.localeCompare(right.label, 'pt-MZ'));
  }, [dialog, folders]);

  const submitDialog = async (event) => {
    event.preventDefault();
    setSaving(true);
    setDialogError('');
    try {
      if (dialog.type === 'create') {
        await createFolder({ name: folderName, parentId: dialog.parent?.id ?? null });
        await reload();
        reveal(dialog.parent?.id);
      } else if (dialog.type === 'rename') {
        await renameFolder(dialog.folder.id, folderName);
        await reload();
      } else if (dialog.type === 'move') {
        const targetId = moveTarget === '' ? null : Number(moveTarget);
        await moveFolder(dialog.folder.id, targetId);
        await reload();
        reveal(targetId);
      } else if (dialog.type === 'delete') {
        const { folder } = dialog;
        const affected = descendantsOf(folder.id);
        affected.add(folder.id);
        await deleteFolder(folder.id, folder.hasContent);
        await reload();
        if (affected.has(currentId)) setCurrentId(folder.parentId ?? null);
      } else if (dialog.type === 'deleteFile') {
        await deleteFolderFile(currentId, dialog.file.id);
        await Promise.all([loadFiles(currentId), reload()]);
      }
      closeDialog();
    } catch (saveError) {
      setDialogError(await requestMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const downloadZip = async (folder) => {
    setZippingId(folder.id);
    setError('');
    try {
      const blob = await downloadFolderZip(folder.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folder.name}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (zipError) {
      setError(await requestMessage(zipError));
    } finally {
      setZippingId(null);
    }
  };

  const upload = async (selected) => {
    if (currentId == null || !selected?.length) return;
    setUploading(true);
    setError('');
    try {
      await uploadFolderFiles(currentId, selected);
      await Promise.all([loadFiles(currentId), reload()]);
    } catch (uploadError) {
      setError(await requestMessage(uploadError));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const openFile = (file, download = false) => {
    window.open(getFolderFileUrl(currentId, file.id, download), '_blank', 'noopener');
  };

  const canDrop = (dragId, targetId) => {
    const dragged = byId.get(dragId);
    if (!dragged || targetId === dragId) return false;
    if ((dragged.parentId ?? null) === targetId) return false;
    return targetId === null || !descendantsOf(dragId).has(targetId);
  };
  const resetDrag = () => {
    setDraggingId(null);
    setDropTarget(undefined);
  };
  const dropOn = async (targetId) => {
    const dragId = draggingId;
    resetDrag();
    if (dragId == null || !canDrop(dragId, targetId)) return;
    setError('');
    try {
      await moveFolder(dragId, targetId);
      await reload();
      reveal(targetId);
    } catch (moveError) {
      setError(await requestMessage(moveError));
    }
  };
  const dragProps = (folder) => ({
    draggable: true,
    onDragStart: (event) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(folder.id));
      setDraggingId(folder.id);
    },
    onDragEnd: resetDrag,
    onDragOver: (event) => {
      if (!canDrop(draggingId, folder.id)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      if (dropTarget !== folder.id) setDropTarget(folder.id);
    },
    onDragLeave: () => setDropTarget((current) => (current === folder.id ? undefined : current)),
    onDrop: (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropOn(folder.id);
    },
  });

  const stop = (event) => event.stopPropagation();
  const toggleMenu = (key) => (event) => {
    event.stopPropagation();
    setMenu((current) => (current === key ? null : key));
  };
  const folderActions = (folder) => (
    <>
      <KbButton type="button" onClick={() => { setCurrentId(folder.id); reveal(folder.id); }}>
        <span><Folder size={14} /> Abrir pasta</span>
      </KbButton>
      <KbButton type="button" onClick={() => openCreate(folder)}>
        <span><FolderPlus size={14} /> Nova subpasta</span>
      </KbButton>
      <KbButton type="button" onClick={() => openRename(folder)}>
        <span><Pencil size={14} /> Renomear</span>
      </KbButton>
      <KbButton type="button" onClick={() => openMove(folder)}>
        <span><FolderInput size={14} /> Mover para…</span>
      </KbButton>
      <KbButton
        type="button"
        disabled={!folder.hasContent || zippingId === folder.id}
        onClick={() => downloadZip(folder)}
      >
        <span><FileArchive size={14} /> {zippingId === folder.id ? 'A comprimir…' : 'Comprimir (.zip)'}</span>
      </KbButton>
      <hr />
      <KbButton type="button" className="danger" onClick={() => openDelete(folder)}>
        <span><Trash2 size={14} /> Apagar</span>
      </KbButton>
    </>
  );

  const renderNode = (folder, isChild = false) => {
    const kids = treeChildren(folder.id);
    const hasKids = kids.length > 0;
    const open = hasKids && (Boolean(normalizedSearch) || expanded.has(folder.id));
    return (
      <div className="kb-node" key={folder.id}>
        {isChild && <span className="kb-connector" />}
        <div
          className={[
            'kb-row',
            isChild ? 'child' : '',
            currentId === folder.id ? 'active' : '',
            draggingId === folder.id ? 'dragging' : '',
            dropTarget === folder.id ? 'drop-target' : '',
          ].join(' ').trim()}
          onClick={() => setCurrentId(folder.id)}
          {...dragProps(folder)}
        >
          <div className="kb-row-main">
            {hasKids ? (
              <KbButton
                type="button"
                className="kb-chevron"
                aria-label={open ? `Recolher ${folder.name}` : `Expandir ${folder.name}`}
                aria-expanded={open}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(folder.id);
                }}
              >
                {open ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
              </KbButton>
            ) : (
              <span className="kb-chevron-spacer" />
            )}
            <Folder
              size={16}
              strokeWidth={1.6}
              fill={open ? '#171717' : 'none'}
              color={open ? '#171717' : '#525252'}
            />
            <span>{folder.name}</span>
          </div>
          <span className="kb-badge">{folder.fileCount}</span>
        </div>
        {open && (
          <div className="kb-children">{kids.map((child) => renderNode(child, true))}</div>
        )}
      </div>
    );
  };

  const creatorFolders = creatorFilter == null ? [] : folders.filter((folder) => creatorKey(folder) === creatorFilter);
  const dialogTitle = {
    create: dialog?.parent ? 'Nova subpasta' : 'Nova pasta',
    rename: 'Renomear pasta',
    move: 'Mover pasta',
    delete: 'Apagar pasta',
    deleteFile: 'Apagar ficheiro',
  }[dialog?.type];
  const submitLabel = {
    create: 'Criar',
    rename: 'Guardar',
    move: 'Mover',
    delete: dialog?.folder?.hasContent ? 'Apagar tudo' : 'Apagar',
    deleteFile: 'Apagar',
  }[dialog?.type];

  return (
    <div className="kb-page">
      <div className="kb-window">
        <div className="kb-rail">
          <img className="kb-rail-logo" src={logo} alt="Logótipo" />
          <nav aria-label="Navegação">
            <KbButton
              type="button"
              className="kb-rail-button"
              title="Todas as pastas"
              onClick={() => setCurrentId(null)}
            >
              <Home size={20} strokeWidth={1.8} />
            </KbButton>
            <KbButton type="button" className="kb-rail-button active" title="Pastas" aria-current="page">
              <FolderTree size={20} strokeWidth={1.8} />
            </KbButton>
          </nav>
          <div className="kb-rail-spacer" />
          <KbButton
            type="button"
            className="kb-rail-button"
            title="Fechar separador"
            onClick={() => window.close()}
          >
            <X size={20} strokeWidth={1.8} />
          </KbButton>
        </div>

        <aside className={`kb-sidebar${sidebarHidden ? ' collapsed' : ''}`} aria-label="Árvore de pastas">
          <div className="kb-sidebar-head">
            <h2>Pastas</h2>
            <div>
              <KbButton type="button" className="kb-icon-button" title="Nova pasta principal" onClick={() => openCreate(null)}>
                <Plus size={16} strokeWidth={2} />
              </KbButton>
              <KbButton type="button" className="kb-icon-button" title="Ocultar painel" onClick={() => setSidebarHidden(true)}>
                <PanelLeft size={16} strokeWidth={1.8} />
              </KbButton>
            </div>
          </div>

          <div className="kb-search">
            <TextField
              fullWidth
              size="small"
              label="Pesquisar pastas"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><Search size={16} /></InputAdornment>
                  ),
                },
              }}
            />
          </div>

          <div className="kb-tabs" role="tablist">
            <KbButton type="button" role="tab" aria-selected={navTab === 'folders'} className={navTab === 'folders' ? 'active' : ''} onClick={() => setNavTab('folders')}>
              Pastas
            </KbButton>
            <KbButton type="button" role="tab" aria-selected={navTab === 'creators'} className={navTab === 'creators' ? 'active' : ''} onClick={() => setNavTab('creators')}>
              Criado por
            </KbButton>
          </div>

          <div className="kb-tree">
            {draggingId != null && byId.get(draggingId)?.parentId != null && (
              <div
                className={`kb-root-drop${dropTarget === null ? ' drop-target' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dropTarget !== null) setDropTarget(null);
                }}
                onDragLeave={() => setDropTarget((current) => (current === null ? undefined : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOn(null);
                }}
              >
                Nível principal
              </div>
            )}
            {loading ? <p className="kb-loading">A carregar pastas…</p> : navTab === 'folders' ? (
              treeChildren(null).length ? treeChildren(null).map((folder) => renderNode(folder)) : (
                <p className="kb-tree-empty">
                  {normalizedSearch ? 'Nenhuma pasta corresponde à pesquisa.' : 'Ainda não existem pastas.'}
                </p>
              )
            ) : (
              creators.length ? creators.map((creator) => (
                <div key={creator.key || 'none'}>
                  <KbButton
                    type="button"
                    className={`kb-creator-row${creatorFilter === creator.key ? ' active' : ''}`}
                    onClick={() => setCreatorFilter((current) => (current === creator.key ? null : creator.key))}
                  >
                    <span className="kb-row-main">
                      <Avatar name={creator.name} code={creator.code} size="sm" />
                      <span>{creator.name}</span>
                    </span>
                    <span className="kb-badge">{creator.count}</span>
                  </KbButton>
                  {creatorFilter === creator.key && (
                    <div className="kb-creator-folders">
                      {creatorFolders.map((folder) => (
                        <div
                          key={folder.id}
                          className={`kb-row child${currentId === folder.id ? ' active' : ''}`}
                          onClick={() => setCurrentId(folder.id)}
                          title={pathOf(folder)}
                        >
                          <div className="kb-row-main">
                            <Folder size={16} strokeWidth={1.6} color="#a3a3a3" />
                            <span>{folder.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )) : <p className="kb-tree-empty">Ainda não existem pastas.</p>
            )}
          </div>

          <div className="kb-sidebar-foot">
            <span>{pluralize(folders.length, 'pasta', 'pastas')}</span>
            <KbButton type="button" className="kb-link-button" onClick={() => openCreate(currentFolder)}>
              <Plus size={14} /> {currentFolder ? 'Criar subpasta' : 'Criar pasta'}
            </KbButton>
          </div>
        </aside>

        <main className="kb-main">
          <header className="kb-topbar">
            <div className="kb-topbar-left">
              {sidebarHidden && (
                <KbButton type="button" className="kb-icon-button" title="Mostrar painel" onClick={() => setSidebarHidden(false)}>
                  <PanelLeft size={18} />
                </KbButton>
              )}
              <div className="kb-location">
                <KbButton type="button" className="kb-location-button" onClick={toggleMenu('location')}>
                  <span>{currentFolder?.name ?? 'Todas as pastas'}</span>
                  <ChevronDown size={16} strokeWidth={2} />
                </KbButton>
                {menu === 'location' && (
                  <div className="kb-menu left" onClick={stop}>
                    <div className="kb-menu-title">Mudar localização</div>
                    <KbButton type="button" onClick={() => { setCurrentId(null); setMenu(null); }}>
                      <span>Todas as pastas</span>
                      {currentId == null && <Check size={14} />}
                    </KbButton>
                    {childrenOf(null).map((root) => (
                      <KbButton key={root.id} type="button" onClick={() => { setCurrentId(root.id); setMenu(null); }}>
                        <span>{root.name}</span>
                        {breadcrumb[0]?.id === root.id && <Check size={14} />}
                      </KbButton>
                    ))}
                    <hr />
                    <KbButton type="button" onClick={() => openCreate(null)}>
                      <span><FolderPlus size={14} /> Criar pasta principal</span>
                    </KbButton>
                  </div>
                )}
              </div>
            </div>
            <div className="kb-topbar-right">
              {currentFolder && (
                <KbButton type="button" className="kb-button" disabled={uploading} onClick={() => fileInput.current?.click()}>
                  <Upload size={14} />
                  <span>{uploading ? 'A carregar…' : 'Carregar ficheiros'}</span>
                </KbButton>
              )}
              <KbButton type="button" className="kb-button primary" onClick={() => openCreate(currentFolder)}>
                <Plus size={14} />
                <span>{currentFolder ? 'Nova subpasta' : 'Nova pasta'}</span>
              </KbButton>
              {currentFolder && (
                <div style={{ position: 'relative' }}>
                  <KbButton type="button" className="kb-icon-button" title="Acções da pasta" onClick={toggleMenu('header')}>
                    <MoreHorizontal size={18} />
                  </KbButton>
                  {menu === 'header' && <div className="kb-menu right" onClick={stop}>{folderActions(currentFolder)}</div>}
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(event) => upload(event.target.files)}
              />
            </div>
          </header>

          {currentFolder && (
            <nav className="kb-breadcrumb" aria-label="Localização">
              <KbButton type="button" onClick={() => setCurrentId(null)}>Todas as pastas</KbButton>
              {breadcrumb.map((item, index) => (
                <span key={item.id} style={{ display: 'contents' }}>
                  <span>›</span>
                  {index === breadcrumb.length - 1
                    ? <strong>{item.name}</strong>
                    : <KbButton type="button" onClick={() => setCurrentId(item.id)}>{item.name}</KbButton>}
                </span>
              ))}
            </nav>
          )}

          {error && (
            <div className="kb-alert" role="alert">
              <span>{error}</span>
              <KbButton type="button" aria-label="Fechar aviso" onClick={() => setError('')}>×</KbButton>
            </div>
          )}

          <div className="kb-content">
            <div className="kb-section-head">
              <h3>Pastas</h3>
              <KbButton type="button" className="kb-text-button" onClick={() => openCreate(currentFolder)}>
                <FolderPlus size={15} /> {currentFolder ? 'Nova subpasta' : 'Nova pasta'}
              </KbButton>
            </div>

            <div className="kb-grid">
              {gridFolders.map((folder) => (
                <div
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  className={[
                    'kb-card',
                    draggingId === folder.id ? 'dragging' : '',
                    dropTarget === folder.id ? 'drop-target' : '',
                  ].join(' ').trim()}
                  onClick={() => { setCurrentId(folder.id); setSearchTerm(''); }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setCurrentId(folder.id);
                  }}
                  {...dragProps(folder)}
                >
                  <div className={`kb-card-menu${menu === `card-${folder.id}` ? ' open' : ''}`}>
                    <KbButton type="button" className="kb-icon-button" aria-label={`Acções de ${folder.name}`} onClick={toggleMenu(`card-${folder.id}`)}>
                      <MoreHorizontal size={16} />
                    </KbButton>
                    {menu === `card-${folder.id}` && <div className="kb-menu right" onClick={stop}>{folderActions(folder)}</div>}
                  </div>
                  <div className="kb-card-graphic">
                    <FolderGraphic
                      hasContent={folder.hasContent}
                      creator={folder.createdBy}
                      creatorCode={folder.createdByCode}
                    />
                  </div>
                  <div className="kb-card-info">
                    <h4 title={pathOf(folder)}>{folder.name}</h4>
                    <p>{pluralize(folder.fileCount, 'ficheiro', 'ficheiros')}</p>
                    <p className="kb-card-creator">
                      <Avatar name={creatorName(folder)} code={folder.createdByCode} size="sm" />
                      <span>{creatorName(folder)}</span>
                      <span>· {formatDate(folder.createdAt)}</span>
                    </p>
                  </div>
                </div>
              ))}

            </div>

            {!loading && gridFolders.length === 0 && (
              <p className="kb-empty">
                {normalizedSearch
                  ? 'Nenhuma pasta corresponde à pesquisa.'
                  : currentFolder ? 'Esta pasta não tem subpastas.' : 'Ainda não existem pastas.'}
              </p>
            )}

            {currentFolder && (
              <>
                <div className="kb-section-head">
                  <h3>Ficheiros</h3>
                  <div className="kb-files-search">
                    <TextField
                      fullWidth
                      size="small"
                      label="Pesquisar ficheiros"
                      value={fileSearch}
                      onChange={(event) => setFileSearch(event.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start"><Search size={16} /></InputAdornment>
                          ),
                        },
                      }}
                    />
                  </div>
                  <KbButton type="button" className="kb-text-button" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    <Upload size={15} /> Adicionar ficheiro
                  </KbButton>
                </div>

                <div
                  className={`kb-files${filesDragOver ? ' drag-over' : ''}`}
                  onDragOver={(event) => {
                    if (!event.dataTransfer.types.includes('Files')) return;
                    event.preventDefault();
                    setFilesDragOver(true);
                  }}
                  onDragLeave={() => setFilesDragOver(false)}
                  onDrop={(event) => {
                    if (!event.dataTransfer.types.includes('Files')) return;
                    event.preventDefault();
                    setFilesDragOver(false);
                    upload(event.dataTransfer.files);
                  }}
                >
                  <StandardTable
                    audit="FolderFile"
                    ariaLabel={`Ficheiros da pasta ${currentFolder.name}`}
                    columns={fileColumns}
                    emptyMessage={fileSearch.trim()
                      ? 'Nenhum ficheiro corresponde à pesquisa.'
                      : 'Esta pasta ainda não tem ficheiros.'}
                    loading={filesLoading && files.length === 0}
                    rows={visibleFiles}
                    renderRow={(file, rowNumber) => (
                      <TableRow key={file.id} hover>
                        <TableCell>{rowNumber}</TableCell>
                        <TableCell>
                          <span className="kb-file-name">
                            <FileIcon name={file.name} />
                            {file.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          {file.addedBy || 'Sem registo'}
                          {file.addedByCode ? ` (${file.addedByCode})` : ''}
                        </TableCell>
                        <TableCell>{formatDateTime(file.addedAt)}</TableCell>
                        <TableCell align="right">{formatSize(file.size)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Visualizar">
                            <IconButton aria-label={`Visualizar ${file.name}`} onClick={() => openFile(file)}>
                              <Eye size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descarregar">
                            <IconButton aria-label={`Descarregar ${file.name}`} onClick={() => openFile(file, true)}>
                              <Download size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Apagar">
                            <IconButton
                              className="cacoin-table-action-delete"
                              aria-label={`Apagar ${file.name}`}
                              onClick={() => openDeleteFile(file)}
                            >
                              <Trash2 size={17} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Dialog
        className="kb-dialog"
        open={Boolean(dialog)}
        onClose={() => !saving && closeDialog()}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={submitDialog}>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogContent>
            {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
            {(dialog?.type === 'create' || dialog?.type === 'rename') && (
              <TextField
                autoFocus
                required
                fullWidth
                size="small"
                label="Nome da pasta"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                sx={{ mt: 1 }}
              />
            )}
            {dialog?.type === 'move' && (
              <TextField
                select
                fullWidth
                size="small"
                label="Mover para"
                value={moveTarget}
                onChange={(event) => setMoveTarget(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                sx={{ mt: 1 }}
              >
                <MenuItem value="">Nível principal</MenuItem>
                {moveTargets.map((target) => (
                  <MenuItem key={target.id} value={String(target.id)}>{target.label}</MenuItem>
                ))}
              </TextField>
            )}
            {dialog?.type === 'delete' && (
              <>
                Apagar &quot;{dialog.folder.name}&quot;{dialog.folder.hasContent ? ' e todo o seu conteúdo' : ''}?
              </>
            )}
            {dialog?.type === 'deleteFile' && <>Apagar o ficheiro &quot;{dialog.file.name}&quot;?</>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{submitLabel}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
