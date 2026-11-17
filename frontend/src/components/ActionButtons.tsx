import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import type { ActionGroup } from '../types';

interface Props {
  groups: ActionGroup[];
  disabled?: boolean;
  onSelect: (value: string) => void;
}

function MenuGroup({ group, disabled, onSelect }: { group: ActionGroup; disabled?: boolean; onSelect: (v: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        disabled={disabled}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ borderColor: 'divider' }}
      >
        {group.label ?? 'Choose…'}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {group.options.map((o) => (
          <MenuItem
            key={o.value}
            onClick={() => {
              setAnchor(null);
              onSelect(o.value);
            }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Renders structured `actions` from the API: pill buttons or a dropdown menu. Selecting sends the value as a message. */
export default function ActionButtons({ groups, disabled, onSelect }: Props) {
  return (
    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {groups.map((group, i) => (
        <Box key={i}>
          {group.type === 'buttons' ? (
            <>
              {group.label && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  {group.label}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {group.options.map((o) => (
                  <Button
                    key={o.value}
                    variant="outlined"
                    color="inherit"
                    size="small"
                    disabled={disabled}
                    onClick={() => onSelect(o.value)}
                    sx={{ borderColor: 'divider', fontWeight: 500 }}
                  >
                    {o.label}
                  </Button>
                ))}
              </Box>
            </>
          ) : (
            <MenuGroup group={group} disabled={disabled} onSelect={onSelect} />
          )}
        </Box>
      ))}
    </Box>
  );
}
