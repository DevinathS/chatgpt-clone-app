import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteConversation, renameConversation } from '../store/conversationsSlice';
import { useAppDispatch } from '../store/hooks';
import { surface } from '../theme';
import type { Conversation } from '../types';
import { downloadConversation } from '../utils/export';

interface Props {
  conversation: Conversation;
  active: boolean;
  onOpen: () => void;
}

export default function ConversationRow({ conversation, active, onOpen }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== conversation.title) dispatch(renameConversation({ id: conversation.id, title: t }));
    setRenaming(false);
  };

  const remove = async () => {
    setConfirmDelete(false);
    await dispatch(deleteConversation(conversation.id));
    if (active) navigate('/');
  };

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2.5,
          bgcolor: active ? surface('hover') : 'transparent',
          '&:hover': { bgcolor: surface('hover') },
          '&:hover .row-more, &:focus-within .row-more': { opacity: 1 },
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={onOpen}
          aria-current={active ? 'page' : undefined}
          sx={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            font: 'inherit',
            color: 'text.primary',
            bgcolor: 'transparent',
            border: 0,
            cursor: 'pointer',
            px: 1.5,
            py: 1,
            borderRadius: 2.5,
          }}
        >
          <Typography noWrap sx={{ fontSize: 14 }}>
            {conversation.title}
          </Typography>
        </Box>
        <IconButton
          className="row-more"
          size="small"
          aria-label={`Options for ${conversation.title}`}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ mr: 0.5, opacity: active || anchor ? 1 : 0, '@media (hover: none)': { opacity: 1 } }}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Box>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setTitle(conversation.title);
            setRenaming(true);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            downloadConversation(conversation.id, conversation.title, 'markdown');
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as Markdown</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setConfirmDelete(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={renaming} onClose={() => setRenaming(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            slotProps={{ htmlInput: { maxLength: 200, 'aria-label': 'Chat title' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setRenaming(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveTitle} disabled={!title.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete <strong>{conversation.title}</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={remove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
