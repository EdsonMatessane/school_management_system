import { avatarColor, initialsOf } from './folderUtils';

/* Pasta ilustrada (réplica do exemplar): as folhas só aparecem quando a pasta tem conteúdo
   e o círculo no canto mostra quem a criou. */
export default function FolderGraphic({ hasContent = false, creator = '', creatorCode = '' }) {
  return (
    <div className="kb-fg" aria-hidden="true">
      <svg className="kb-fg-back" viewBox="0 0 164 110" fill="none">
        <path
          d="M12 4C12 1.79086 13.7909 0 16 0H62C65.5 0 68.5 2 71 5L77.5 13C79.5 15.5 82.5 17 86 17H148C154.627 17 160 22.3726 160 29V96C160 102.627 154.627 108 148 108H16C9.37258 108 4 102.627 4 96V12C4 7.58172 7.58172 4 12 4Z"
          fill="#3e4348"
        />
      </svg>

      {hasContent && (
        <div className="kb-fg-papers">
          <div className="kb-fg-paper kb-fg-paper-left"><i /><i /></div>
          <div className="kb-fg-paper kb-fg-paper-middle"><i /><i /></div>
          <div className="kb-fg-paper kb-fg-paper-front"><span>DOC</span></div>
        </div>
      )}

      <div className="kb-fg-front">
        <svg viewBox="0 0 164 100" fill="none">
          <path
            d="M0 16C0 7.16344 7.16344 0 16 0H52.5C57.5 0 61.5 3 64.5 7L69 13.5C72 17.5 76.5 20 81.5 20H148C156.837 20 164 27.1634 164 36V84C164 92.8366 156.837 100 148 100H16C7.16344 100 0 92.8366 0 84V16Z"
            fill="#565b61"
          />
          <path
            d="M16 1H52.2C56.8 1 60.6 3.8 63.4 7.5L68 14.2C71.2 18.5 76 21 81.3 21H148C156.2 21 163 27.8 163 36"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
        {creator && (
          <span
            className="kb-fg-creator"
            style={{ background: avatarColor(creatorCode || creator) }}
            title={`Criada por ${creator}`}
          >
            {initialsOf(creator)}
          </span>
        )}
      </div>
    </div>
  );
}
