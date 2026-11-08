import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { MoreVertical } from 'lucide-react';

export default function MoreActionsButton({
  onClick,
  actions,
  onAction,
  disabled = false,
  ariaLabel = 'Mais acções',
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const hasActionMenu = Array.isArray(actions) && typeof onAction === 'function';

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<MoreVertical size={16} />}
        onClick={hasActionMenu ? (event) => setAnchorEl(event.currentTarget) : onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        sx={{ textTransform: 'none', color: '#052E5E', borderColor: '#d8e3f0' }}
      >
        Mais acções
      </Button>
      {hasActionMenu && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {actions.map((action) => (
            <MenuItem
              key={action.value}
              onClick={() => {
                setAnchorEl(null);
                onAction(action.value);
              }}
            >
              {action.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
