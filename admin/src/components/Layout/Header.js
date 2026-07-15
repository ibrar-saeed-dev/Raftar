import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

const Header = ({ drawerWidth, handleDrawerToggle }) => {
  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: '#1E1E1E',
        borderBottom: '1px solid #2A2A2A'
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#FFD700' }}>
          Raftar Admin
        </Typography>
        <IconButton color="inherit" sx={{ color: '#FFF' }}>
          <Badge badgeContent={4} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Avatar
          src={user.profilePhoto}
          sx={{
            width: 32,
            height: 32,
            ml: 2,
            bgcolor: '#FFD700',
            color: '#121212'
          }}
        >
          {user.name?.charAt(0) || 'A'}
        </Avatar>
      </Toolbar>
    </AppBar>
  );
};

export default Header;